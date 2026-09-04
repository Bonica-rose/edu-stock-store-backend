const tf = require("@tensorflow/tfjs-node");

const { AI_CONFIG } = require("../../constants/ai.constants");

const {
  buildCurrentFeatures,
  buildTrainingDataset,
} = require("../../utils/ai/featureEngineering");

/*
 * TensorFlow model cache.
 *
 * historyDays is stored so that if the administrator
 * changes predictionHistoryDays in Settings, the cached
 * model will no longer be considered valid.
 */
let modelState = {
  model: null,
  mean: null,
  std: null,
  sampleCount: 0,
  trainedAt: null,
  historyDays: null,
};

/**
 * Dispose TensorFlow tensors safely.
 */
const disposeTensorArray = (items = []) => {
  for (const item of items) {
    if (item && typeof item.dispose === "function") {
      item.dispose();
    }
  }
};

/**
 * Calculate normalization parameters for
 * the training features.
 */
const calculateNormalization = (rows) => {
  const featureCount = rows[0].features.length;

  const mean = new Array(featureCount).fill(0);

  const std = new Array(featureCount).fill(0);

  /*
   * Calculate mean.
   */
  for (const row of rows) {
    row.features.forEach((value, index) => {
      mean[index] += Number(value || 0);
    });
  }

  for (let i = 0; i < featureCount; i++) {
    mean[i] /= rows.length;
  }

  /*
   * Calculate standard deviation.
   */
  for (const row of rows) {
    row.features.forEach((value, index) => {
      const difference = Number(value || 0) - mean[index];

      std[index] += difference * difference;
    });
  }

  for (let i = 0; i < featureCount; i++) {
    std[i] = Math.sqrt(std[i] / rows.length) || 1;
  }

  return {
    mean,
    std,
  };
};

/**
 * Normalize training rows using the calculated
 * mean and standard deviation.
 */
const normalizeRows = (rows, mean, std) =>
  rows.map((row) =>
    row.features.map(
      (value, index) => (Number(value || 0) - mean[index]) / std[index],
    ),
  );

/**
 * Create the TensorFlow neural network.
 */
const buildModel = (inputSize) => {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      inputShape: [inputSize],

      units: 32,

      activation: "relu",
    }),
  );

  model.add(
    tf.layers.dense({
      units: 16,

      activation: "relu",
    }),
  );

  model.add(
    tf.layers.dense({
      units: 1,

      activation: "relu",
    }),
  );

  model.compile({
    optimizer: tf.train.adam(0.01),

    loss: "meanSquaredError",

    metrics: ["mae"],
  });

  return model;
};

/**
 * Train the demand prediction model.
 *
 * predictionHistoryDays is supplied by Settings,
 * rather than being hardcoded in AI_CONFIG.
 */
const trainModel = async (
  inventories,
  movements,
  today = new Date(),
  predictionHistoryDays,
) => {
  /*
   * Make sure a valid history period is always used.
   */
  const historyDays = Math.max(7, Number(predictionHistoryDays ?? 30));

  /*
   * Build historical training samples using the
   * configured history window.
   */
  const trainingRows = buildTrainingDataset(
    inventories,
    movements,
    today,
    historyDays,
  );

  /*
   * Not enough historical data to train a
   * meaningful model.
   */
  if (trainingRows.length < AI_CONFIG.TRAINING_MIN_SAMPLES) {
    /*
     * Dispose the previous model because the
     * current data/settings cannot produce a
     * sufficiently trained model.
     */
    if (modelState.model) {
      modelState.model.dispose();
    }

    modelState = {
      model: null,
      mean: null,
      std: null,
      sampleCount: trainingRows.length,
      trainedAt: null,
      historyDays,
    };

    return false;
  }

  /*
   * Calculate feature normalization parameters.
   */
  const { mean, std } = calculateNormalization(trainingRows);

  /*
   * Normalize training features.
   */
  const normalizedFeatures = normalizeRows(trainingRows, mean, std);

  /*
   * Convert features to TensorFlow tensors.
   */
  const xs = tf.tensor2d(normalizedFeatures);

  /*
   * Target = future daily demand.
   */
  const ys = tf.tensor2d(
    trainingRows.map((row) => [Math.max(0, Number(row.target || 0))]),
  );

  /*
   * Build a fresh neural network.
   */
  const model = buildModel(normalizedFeatures[0].length);

  /*
   * Train the model.
   */
  await model.fit(xs, ys, {
    epochs: 35,

    batchSize: Math.min(32, trainingRows.length),

    shuffle: true,

    verbose: 0,

    validationSplit: trainingRows.length >= 50 ? 0.1 : 0,
  });

  /*
   * Release training tensors.
   */
  xs.dispose();
  ys.dispose();

  /*
   * Dispose the previous cached model.
   */
  if (modelState.model) {
    modelState.model.dispose();
  }

  /*
   * Cache the newly trained model.
   *
   * historyDays is important because Settings
   * can change this value.
   */
  modelState = {
    model,

    mean,

    std,

    sampleCount: trainingRows.length,

    trainedAt: new Date(),

    historyDays,
  };

  return true;
};

/**
 * Ensure that a valid TensorFlow model exists.
 *
 * A cached model can only be reused when it was
 * trained using the same predictionHistoryDays.
 */
const ensureModel = async (
  inventories,
  movements,
  today = new Date(),
  predictionHistoryDays,
) => {
  const historyDays = Math.max(7, Number(predictionHistoryDays ?? 30));

  /*
   * Reuse the cached model only if the history
   * configuration has not changed.
   */
  if (modelState.model && modelState.historyDays === historyDays) {
    return true;
  }

  /*
   * If the history setting changed, the old model
   * is no longer valid.
   */
  if (modelState.model && modelState.historyDays !== historyDays) {
    modelState.model.dispose();

    modelState = {
      model: null,
      mean: null,
      std: null,
      sampleCount: 0,
      trainedAt: null,
      historyDays: null,
    };
  }

  return trainModel(inventories, movements, today, historyDays);
};

/**
 * Generate demand predictions for all supplied
 * inventory items.
 */
const predictDemand = async (
  inventories,
  movements,
  today = new Date(),
  predictionHistoryDays,
) => {
  /*
   * Ensure a TensorFlow model is available.
   */
  const modelAvailable = await ensureModel(
    inventories,
    movements,
    today,
    predictionHistoryDays,
  );

  const predictions = new Map();

  /*
   * Generate prediction for each inventory item.
   */
  for (const inventory of inventories) {
    const { features, metrics } = buildCurrentFeatures(
      inventory,
      movements,
      today,
    );

    /*
     * If there is not enough historical data,
     * use recent consumption as the fallback
     * demand estimate.
     */
    if (!modelAvailable) {
      predictions.set(String(inventory._id), {
        predictedDailyDemand: Math.max(
          0,
          Number(metrics.recentDailyConsumption || 0),
        ),

        modelUsed: false,

        trainingSamples: modelState.sampleCount,

        features,

        metrics,
      });

      continue;
    }

    /*
     * Normalize the current inventory's features
     * using the same values used during training.
     */
    const normalized = features.map(
      (value, index) =>
        (Number(value || 0) - modelState.mean[index]) / modelState.std[index],
    );

    /*
     * Create TensorFlow input tensor.
     */
    const input = tf.tensor2d([normalized]);

    /*
     * Generate prediction.
     */
    const output = modelState.model.predict(input);

    /*
     * Extract prediction value.
     */
    const value = Array.isArray(output)
      ? output[0].dataSync()[0]
      : output.dataSync()[0];

    /*
     * Dispose prediction tensors.
     */
    disposeTensorArray(Array.isArray(output) ? output : [output]);

    input.dispose();

    /*
     * Store prediction.
     */
    predictions.set(String(inventory._id), {
      predictedDailyDemand: Math.max(0, Number(value || 0)),

      modelUsed: true,

      trainingSamples: modelState.sampleCount,

      features,

      metrics,
    });
  }

  return predictions;
};

/**
 * Return the current TensorFlow model status.
 *
 * Useful for debugging or an optional admin/system
 * monitoring endpoint.
 */
const getModelStatus = () => ({
  loaded: Boolean(modelState.model),

  sampleCount: modelState.sampleCount,

  trainedAt: modelState.trainedAt,

  historyDays: modelState.historyDays,
});

module.exports = {
  trainModel,
  predictDemand,
  getModelStatus,
};
