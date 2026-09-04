const MS_PER_DAY = 24 * 60 * 60 * 1000;

const clampDate = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const dayKey = (date) => clampDate(date).toISOString().slice(0, 10);

const addDays = (date, amount) =>
    new Date(clampDate(date).getTime() + amount * MS_PER_DAY);

const sumRange = (dailyMap, startDate, endDate) => {
    let total = 0;
    for (
        let cursor = clampDate(startDate);
        cursor <= clampDate(endDate);
        cursor = addDays(cursor, 1)
    ) {
        total += dailyMap.get(dayKey(cursor)) || 0;
    }
    return total;
};

const countNonZeroRange = (dailyMap, startDate, endDate) => {
    let count = 0;
    for (
        let cursor = clampDate(startDate);
        cursor <= clampDate(endDate);
        cursor = addDays(cursor, 1)
    ) {
        if ((dailyMap.get(dayKey(cursor)) || 0) > 0) count += 1;
    }
    return count;
};

const buildDailyMaps = (movements = []) => {
    const stockOut = new Map();
    const stockIn = new Map();
    const deltas = new Map();

    for (const movement of movements) {
        const key = dayKey(movement.createdAt);
        const inventoryId = String(movement.inventory);

        if (!deltas.has(inventoryId)) deltas.set(inventoryId, new Map());
        const inventoryDeltas = deltas.get(inventoryId);
        const delta =
            Number(movement.newStock ?? 0) - Number(movement.previousStock ?? 0);

        inventoryDeltas.set(
            key,
            (inventoryDeltas.get(key) || 0) + delta,
        );

        if (movement.movementType === "Stock Out") {
            if (!stockOut.has(inventoryId)) stockOut.set(inventoryId, new Map());
            const map = stockOut.get(inventoryId);
            map.set(key, (map.get(key) || 0) + Number(movement.quantity || 0));
        }

        if (movement.movementType === "Stock In") {
            if (!stockIn.has(inventoryId)) stockIn.set(inventoryId, new Map());
            const map = stockIn.get(inventoryId);
            map.set(key, (map.get(key) || 0) + Number(movement.quantity || 0));
        }
    }

    return { stockOut, stockIn, deltas };
};

const getHistoricalStock = (
    inventory,
    inventoryDeltas,
    sampleDate,
    today,
) => {
    const currentStock = Number(inventory.currentStock || 0);

    let movementAfterSample = 0;

    for (
        let cursor = addDays(sampleDate, 1);
        cursor <= clampDate(today);
        cursor = addDays(cursor, 1)
    ) {
        movementAfterSample += inventoryDeltas?.get(dayKey(cursor)) || 0;
    }

    return Math.max(0, currentStock - movementAfterSample);
};

const createFeatureVector = ({
    stock,
    minimumStock,
    recent7,
    previous7,
    consumption30,
    stockIn30,
    stockOutFrequency30,
    stockInFrequency30,
    date,
}) => {
    const averageDailyConsumption = consumption30 / 30;
    const recentDailyConsumption = recent7 / 7;
    const previousDailyConsumption = previous7 / 7;

    return [
        stock,
        minimumStock,
        averageDailyConsumption,
        recentDailyConsumption,
        previousDailyConsumption,
        stockIn30 / 30,
        stockOutFrequency30,
        stockInFrequency30,
        clampDate(date).getDay(),
        clampDate(date).getMonth() + 1,
    ];
};

const buildCurrentFeatures = (inventory, movements, today = new Date()) => {
    const { stockOut, stockIn } = buildDailyMaps(movements);
    const inventoryId = String(inventory._id);
    const outMap = stockOut.get(inventoryId) || new Map();
    const inMap = stockIn.get(inventoryId) || new Map();

    const todayDate = clampDate(today);
    const last30Start = addDays(todayDate, -29);
    const last7Start = addDays(todayDate, -6);
    const previous7Start = addDays(todayDate, -13);
    const previous7End = addDays(todayDate, -7);

    const consumption30 = sumRange(outMap, last30Start, todayDate);
    const recent7 = sumRange(outMap, last7Start, todayDate);
    const previous7 = sumRange(outMap, previous7Start, previous7End);
    const stockIn30 = sumRange(inMap, last30Start, todayDate);

    return {
        features: createFeatureVector({
            stock: Number(inventory.currentStock || 0),
            minimumStock: Number(inventory.minimumStock || 0),
            recent7,
            previous7,
            consumption30,
            stockIn30,
            stockOutFrequency30: countNonZeroRange(outMap, last30Start, todayDate),
            stockInFrequency30: countNonZeroRange(inMap, last30Start, todayDate),
            date: todayDate,
        }),
        metrics: {
            averageDailyConsumption: consumption30 / 30,
            recentDailyConsumption: recent7 / 7,
            previousDailyConsumption: previous7 / 7,
            recentConsumptionTrend:
                previous7 > 0 ? recent7 / previous7 : recent7 > 0 ? 2 : 1,
            stockIn30,
            stockOut30: consumption30,
        },
    };
};

const buildTrainingDataset = (
    inventories,
    movements,
    today = new Date(),
    historyDays = 150,
) => {
    const { stockOut, stockIn, deltas } = buildDailyMaps(movements);
    const samples = [];

    const endSampleDate = addDays(today, -7);
    const startSampleDate = addDays(today, -(historyDays - 30));

    for (const inventory of inventories) {
        const inventoryId = String(inventory._id);
        const outMap = stockOut.get(inventoryId) || new Map();
        const inMap = stockIn.get(inventoryId) || new Map();
        const deltaMap = deltas.get(inventoryId) || new Map();

        for (
            let sampleDate = clampDate(startSampleDate);
            sampleDate <= clampDate(endSampleDate);
            sampleDate = addDays(sampleDate, 1)
        ) {
            const previous30Start = addDays(sampleDate, -29);
            const recent7Start = addDays(sampleDate, -6);
            const previous7Start = addDays(sampleDate, -13);
            const previous7End = addDays(sampleDate, -7);
            const targetEnd = addDays(sampleDate, 6);

            const consumption30 = sumRange(
                outMap,
                previous30Start,
                sampleDate,
            );
            const recent7 = sumRange(outMap, recent7Start, sampleDate);
            const previous7 = sumRange(
                outMap,
                previous7Start,
                previous7End,
            );
            const stockIn30 = sumRange(
                inMap,
                previous30Start,
                sampleDate,
            );

            const target = sumRange(
                outMap,
                addDays(sampleDate, 1),
                targetEnd,
            );

            const stock = getHistoricalStock(
                inventory,
                deltaMap,
                sampleDate,
                today,
            );

            const features = createFeatureVector({
                stock,
                minimumStock: Number(inventory.minimumStock || 0),
                recent7,
                previous7,
                consumption30,
                stockIn30,
                stockOutFrequency30: countNonZeroRange(
                    outMap,
                    previous30Start,
                    sampleDate,
                ),
                stockInFrequency30: countNonZeroRange(
                    inMap,
                    previous30Start,
                    sampleDate,
                ),
                date: sampleDate,
            });

            samples.push({ features, target });
        }
    }

    return samples;
};

module.exports = {
    buildCurrentFeatures,
    buildTrainingDataset,
};
