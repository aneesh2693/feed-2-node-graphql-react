// For GraphQL

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    if (!req.get('Authorization')) {
        req.isAuth = false;
        return next();
    }
    const token = req.get('Authorization').split(' ')[1];
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, 'jsgk&U566knm_0-0uihikj');
    } catch (err) {
        req.isAuth = false;
        return next();
    }
    if (!decodedToken) {
        req.isAuth = false;
        return next();
    }
    req.userId = decodedToken.userId;
    req.isAuth = true;
    next();
}