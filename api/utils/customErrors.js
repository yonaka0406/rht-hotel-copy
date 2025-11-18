class ValidationError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', statusCode = 400, details = []) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = Array.isArray(details) ? details : [details]; // Ensure details is an array
        // This ensures the stack trace is captured correctly in V8
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ValidationError);
        }
    }
}

module.exports = {
    ValidationError,
};
