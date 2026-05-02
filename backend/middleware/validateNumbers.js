const ApiError = require("../utils/ApiError");

const validateNumbers = (req, res, next) => {
  const checkFields = [
    'profit', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 
    'commission', 'swap', 'quantity', 'lotSize', 'strikePrice', 'sharesQty',
    'brokerage', 'sttTaxes'
  ];
  
  for (const field of checkFields) {
    if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
      const num = Number(req.body[field]);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        return next(new ApiError(400, `Invalid numeric value for field: ${field}`));
      }
    }
  }
  next();
};

module.exports = { validateNumbers };
