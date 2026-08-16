const Inventory = require("../models/inventory.model");
const StockMovement = require("../models/stockMovement.model");
const Category = require("../models/category.model");
const Vendor = require("../models/vendor.model");
const Branch = require("../models/branch.model");
const ApiError = require("../utils/apiError.util");
const { ROLES } = require("../constants/roles");
const { logActivity } = require("./activity.service");
const {
  ACTIVITY_MODULES,
  ACTIVITY_ACTIONS,
} = require("../constants/activity.constants");
const { getSettings } = require("./settings.service");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../utils/cloudinary");

const getInventories = async (query, user) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    category,
    vendor,
    branch,
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const filter = {
    isDeleted: false,
  };

  // Search
  if (search) {
    filter.$or = [
      { itemName: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { barcode: { $regex: search, $options: "i" } },
    ];
  }

  // Filters
  if (category) filter.category = category;

  if (vendor) filter.vendor = vendor;

  if (branch) filter.branch = branch;

  if (typeof isActive !== "undefined") {
    filter.isActive = isActive === "true";
  }

  // Branch restriction
  if (user.role === ROLES.BRANCH_ADMIN) {
    filter.branch = user.branch;
  }

  const allowedSortFields = [
    "itemName",
    "sku",
    "currentStock",
    "purchasePrice",
    "createdAt",
  ];

  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const sort = {
    [sortField]: sortOrder === "asc" ? 1 : -1,
  };

  const skip = (Number(page) - 1) * Number(limit);

  const [inventories, total] = await Promise.all([
    Inventory.find(filter)
      .populate("category", "categoryName")
      .populate("vendor", "vendorName")
      .populate("branch", "branchName")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    Inventory.countDocuments(filter),
  ]);

  return {
    inventories,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getInventory = async (inventoryId, user) => {
  const inventory = await Inventory.findOne({
    _id: inventoryId,
    isDeleted: false,
  })
    .populate("category", "categoryName")
    .populate("vendor", "vendorName")
    .populate("branch", "branchName")
    .populate("createdBy", "employeeId firstName lastName")
    .populate("updatedBy", "employeeId firstName lastName")
    .populate("deletedBy", "employeeId firstName lastName");

  if (!inventory) {
    throw new ApiError(404, "Inventory not found.");
  }

  // Branch Admin can access only their own branch inventory
  if (
    user.role === ROLES.BRANCH_ADMIN &&
    inventory.branch._id.toString() !== user.branch.toString()
  ) {
    throw new ApiError(403, "You are not authorized to access this inventory.");
  }

  return inventory;
};

const createInventory = async (inventoryData, file, user, requestInfo) => {
  const {
    itemName,
    barcode,
    category,
    vendor,
    branch,
    minimumStock, // set value from settings model
    unit,
    purchasePrice,
    description,
    itemImage,
  } = inventoryData;

  // Category
  const existingCategory = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found.");
  }

  // Vendor
  const existingVendor = await Vendor.findOne({
    _id: vendor,
    isActive: true,
  });

  if (!existingVendor) {
    throw new ApiError(404, "Vendor not found.");
  }

  // Branch
  const existingBranch = await Branch.findOne({
    _id: branch,
    isActive: true,
  });

  if (!existingBranch) {
    throw new ApiError(404, "Branch not found.");
  }

  // Branch Admin restriction
  if (user.role === "Branch Admin" && user.branch.toString() !== branch) {
    throw new ApiError(
      403,
      "You can create inventory only for your own branch.",
    );
  }

  // Barcode
  if (barcode) {
    const existingBarcode = await Inventory.findOne({
      barcode,
      isDeleted: false,
    });

    if (existingBarcode) {
      throw new ApiError(409, "Barcode already exists.");
    }
  }

  // Generate SKU
  const lastInventory = await Inventory.findOne()
    .sort({ createdAt: -1 })
    .select("sku");

  let nextNumber = 1;
  if (lastInventory?.sku) {
    nextNumber = parseInt(lastInventory.sku.replace("INV-", ""), 10) + 1;
  }

  const sku = `INV-${String(nextNumber).padStart(6, "0")}`;

  const settings = await getSettings();
  const minStock = settings.lowStockQuantityThreshold;

  const inventoryDataToCreate = {
    sku,
    itemName,
    category,
    vendor,
    branch,
    currentStock: 0,
    minimumStock: minStock,
    unit,
    purchasePrice,
    description,
    itemImage,
    createdBy: user._id,
  };

  if (barcode) {
    inventoryDataToCreate.barcode = barcode;
  }

  if (file) {
    const itemPicture = await uploadToCloudinary(
      file.path,
      "edu-stock-store/inventories",
    );

    inventoryDataToCreate.itemImage = itemPicture.url;
    inventoryDataToCreate.itemImagePublicId = itemPicture.publicId;
  }

  const inventory = await Inventory.create(inventoryDataToCreate);

  await logActivity({
    user: user._id,
    module: ACTIVITY_MODULES.INVENTORY,
    action: ACTIVITY_ACTIONS.CREATE,
    recordId: inventory._id,
    recordCode: inventory.sku,
    description: `Created inventory ${inventory.sku}.`,
    ...requestInfo,
  });

  return inventory;
};

const updateInventory = async (
  inventoryId,
  inventoryData,
  file,
  user,
  requestInfo,
) => {
  const inventory = await Inventory.findOne({
    _id: inventoryId,
    isDeleted: false,
  });
  if (!inventory) {
    throw new ApiError(404, "Inventory not found.");
  }

  // Branch Admin can update only their own branch inventory
  if (
    user.role === ROLES.BRANCH_ADMIN &&
    inventory.branch.toString() !== user.branch.toString()
  ) {
    throw new ApiError(403, "You are not authorized to update this inventory.");
  }

  // Validate category
  if (inventoryData.category) {
    const category = await Category.findOne({
      _id: inventoryData.category,
      isActive: true,
    });

    if (!category) {
      throw new ApiError(404, "Category not found.");
    }
  }

  // Validate vendor
  if (inventoryData.vendor) {
    const vendor = await Vendor.findOne({
      _id: inventoryData.vendor,
      isActive: true,
    });

    if (!vendor) {
      throw new ApiError(404, "Vendor not found.");
    }
  }

  // Validate branch
  if (inventoryData.branch) {
    const branch = await Branch.findOne({
      _id: inventoryData.branch,
      isActive: true,
    });

    if (!branch) {
      throw new ApiError(404, "Branch not found.");
    }
  }

  // Check duplicate barcode
  if (inventoryData.barcode) {
    const existingBarcode = await Inventory.findOne({
      barcode: inventoryData.barcode,
      _id: { $ne: inventoryId },
    });

    if (existingBarcode) {
      throw new ApiError(409, "Barcode already exists.");
    }
  }

  const updateData = {
    itemName: inventoryData.itemName,
    barcode: inventoryData.barcode,
    category: inventoryData.category,
    vendor: inventoryData.vendor,
    branch: inventoryData.branch,
    minimumStock: inventoryData.minimumStock,
    unit: inventoryData.unit,
    description: inventoryData.description,
    updatedBy: user._id,
  };

  if (file) {
    if (inventory.itemImagePublicId) {
      await deleteFromCloudinary(inventory.itemImagePublicId);
    }
    const itemPicture = await uploadToCloudinary(
      file.path,
      "edu-stock-store/inventories",
    );

    updateData.itemImage = itemPicture.url;
    updateData.itemImagePublicId = itemPicture.publicId;
  }

  const updatedInventory = await Inventory.findByIdAndUpdate(
    inventoryId,
    updateData,
    {
      new: true,
      runValidators: true,
    },
  )
    .populate("category", "categoryName")
    .populate("vendor", "vendorName")
    .populate("branch", "branchName");

  await logActivity({
    user: user._id,
    module: ACTIVITY_MODULES.INVENTORY,
    action: ACTIVITY_ACTIONS.UPDATE,
    recordId: updatedInventory._id,
    recordCode: updatedInventory.sku,
    description: `Updated inventory ${updatedInventory.sku}.`,
    ...requestInfo,
  });

  return updatedInventory;
};

const changeInventoryStatus = async (inventoryId, user, requestInfo) => {
  const inventory = await Inventory.findOne({
    _id: inventoryId,
    isDeleted: false,
  });
  if (!inventory) {
    throw new ApiError(404, "Inventory not found.");
  }

  // Branch Admin can change status only for their own branch inventory
  if (
    user.role === ROLES.BRANCH_ADMIN &&
    inventory.branch.toString() !== user.branch.toString()
  ) {
    throw new ApiError(
      403,
      "You are not authorized to change the status of this inventory.",
    );
  }

  inventory.isActive = !inventory.isActive;
  inventory.updatedBy = user._id;
  await inventory.save();

  await logActivity({
    user: user._id,
    module: ACTIVITY_MODULES.INVENTORY,
    action: ACTIVITY_ACTIONS.STATUS_CHANGE,
    recordId: inventory._id,
    recordCode: inventory.sku,
    description: `Inventory ${inventory.sku} was ${
      inventory.isActive ? "activated" : "deactivated"
    }.`,
    metadata: {
      isActive: inventory.isActive,
    },
    ...requestInfo,
  });

  return inventory;
};

const deleteInventory = async (inventoryId, user, requestInfo) => {
  const inventory = await Inventory.findOne({
    _id: inventoryId,
    isDeleted: false,
  });
  if (!inventory) {
    throw new ApiError(404, "Inventory not found.");
  }

  // Prevent deletion if stock movement exists.
  const transactionExists = await StockMovement.exists({
    inventory: inventoryId,
  });
  if (transactionExists) {
    throw new ApiError(
      400,
      "Cannot delete inventory with stock transaction history.",
    );
  }

  inventory.isDeleted = true;
  inventory.deletedBy = user._id;
  await inventory.save();

  await logActivity({
    user: user._id,
    module: ACTIVITY_MODULES.INVENTORY,
    action: ACTIVITY_ACTIONS.DELETE,
    recordId: inventory._id,
    recordCode: inventory.sku,
    description: `Deleted inventory ${inventory.sku}.`,
    ...requestInfo,
  });

  return inventory;
};

module.exports = {
  getInventories,
  getInventory,
  createInventory,
  updateInventory,
  changeInventoryStatus,
  deleteInventory,
};
