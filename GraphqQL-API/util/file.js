const fs = require('fs');
const path = require('path');

// Function to clear file
const clearImage = filepath => {
    filepath = path.join(__dirname, '..', filepath);
    fs.unlink(filepath, err => {
        console.log(err)
    });
};

exports.clearImage = clearImage;