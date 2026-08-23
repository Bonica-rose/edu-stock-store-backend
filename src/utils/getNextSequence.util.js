const Counter = require("../models/counter.model");

const getNextSequence = async (name, session = null) => {
    const counter = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        {
            returnDocument: "after",
            upsert: true,
            setDefaultsOnInsert: true,
            session,
        },
    );

    return counter.seq;
};

module.exports = {
    getNextSequence,
};
