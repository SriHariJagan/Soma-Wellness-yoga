const NOSQL_KEYWORDS = /\$(where|regex|ne|eq|gt|gte|lt|lte|in|nin|exists|all|elemMatch|mod|text|search|slice|natural|nor|not|or|and)/i;

function deepSanitize(obj) {
  if (Array.isArray(obj)) {
    for (const item of obj) deepSanitize(item);
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (NOSQL_KEYWORDS.test(key)) {
        delete obj[key];
      } else {
        deepSanitize(obj[key]);
      }
    }
  }
}

export function sanitizeQueryParams(req, res, next) {
  deepSanitize(req.query);
  deepSanitize(req.body);
  deepSanitize(req.params);
  next();
}

export default sanitizeQueryParams;
