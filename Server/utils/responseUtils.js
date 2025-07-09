/**
 * Standard error response wrapper for async controller functions
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(`Error in ${fn.name || 'controller'}:`, error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  });
};

/**
 * Common error response patterns
 */
export const ErrorResponses = {
  notFound: (resource = 'Resource') => ({
    status: 404,
    message: `${resource} not found`
  }),
  
  accessDenied: (message = 'Access denied') => ({
    status: 403,
    message
  }),
  
  unauthorized: (message = 'Authentication required') => ({
    status: 401,
    message
  }),
  
  badRequest: (message = 'Bad request') => ({
    status: 400,
    message
  }),
  
  conflict: (message = 'Resource conflict') => ({
    status: 409,
    message
  })
};

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {Object} error - Error object with status and message
 */
export const sendError = (res, error) => {
  res.status(error.status).json({ message: error.message });
};

/**
 * Send standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Data to send
 * @param {string} message - Optional success message
 * @param {number} status - HTTP status code (default: 200)
 */
export const sendSuccess = (res, data, message = null, status = 200) => {
  const response = message ? { message, data } : data;
  res.status(status).json(response);
};