// api/envSetup.js
console.log('envSetup started');

module.exports = (req, res, next) => {
    console.log('Middleware');
    console.log(req.headers);
    
    try {
        const origin = req.get('Origin') || req.get('Referer');
        const host = req.headers.host; // Get the host header

        console.log('Origin:', origin);
        console.log('Host:', host);

        if (origin && origin.includes('test.wehub.work')) {
            process.env.NODE_ENV = 'development';
            console.log('NODE_ENV set to development (test.wehub.work)');
        } else if (origin && origin.includes('wehub.work')) {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = process.env.PROD_FRONTEND_URL;
            process.env.PG_DATABASE = process.env.PROD_PG_DATABASE;
            console.log('NODE_ENV set to production (wehub.work)');
        } else {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = process.env.PROD_FRONTEND_URL;
            process.env.PG_DATABASE = process.env.PROD_PG_DATABASE;
            console.log('NODE_ENV set to production (default)');
        }
        console.log('NODE_ENV after middleware:', process.env.NODE_ENV);
        next();
    } catch (error) {
        console.error('Error in envSetup middleware:', error);
        // You might want to set a default NODE_ENV here in case of errors
        process.env.NODE_ENV = 'development'; // Or 'production', depending on your default
        console.log('NODE_ENV set to default (error)');
        next(); // Still call next() to prevent request hanging
    }
};