const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { clearImage } = require('../util/file');

const User = require('../model/user');
const Post = require('../model/post');

module.exports = {
    createUser: async function ({ userInput }, req) {
        try {
            const email = userInput.email;
            const password = userInput.password;
            const name = userInput.name;
            const errors = [];
            if (!validator.isEmail(email)) {
                errors.push({ message: 'Please enter valid email!' })
            }
            if (validator.isEmpty(password) || !validator.isLength(password, { min: 6 })) {
                errors.push({ message: 'Please enter valid password! Minimum 6 characters' })
            }

            if (errors.length > 0) {
                const error = new Error('Invalid Input!');
                error.data = errors;
                error.code = 422;
                throw error;
            }

            const existingUser = await User.findOne({ email: email });
            if (existingUser) {
                const error = new Error('User Already Exists!!!');
                error.code = 422;
                throw error;
            }
            const hashedPassword = await bcrypt.hash(password, 12);
            const user = new User({
                email: email,
                password: hashedPassword,
                name: name,
                posts: []
            });
            const createdUser = await user.save();
            return {
                ...createdUser._doc,
                _id: createdUser._id.toString()
            }
        } catch (err) {
            if (!err.code) {
                err.code = 500;
                console.log(err);
            }
            throw err;
        }
    },

    login: async function ({ email, password }, req) {
        try {
            const user = await User.findOne({ email: email });
            if (!user) {
                const error = new Error('User not found!');
                error.code = 401;
                throw error;
            }
            const isEqual = await bcrypt.compare(password, user.password);
            if (!isEqual) {
                const error = new Error('Wrong password!');
                error.code = 401;
                throw error;
            }

            const token = jwt.sign({
                email: user.email,
                userId: user._id.toString()
            },
                'jsgk&U566knm_0-0uihikj',
                {
                    expiresIn: '1h'
                });

            return {
                token: token,
                userId: user._id.toString()
            };
        }
        catch (err) {
            if (!err.code) {
                err.code = 500;
                console.log(err);
            }
            throw err;
        }
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if ((validator.isEmpty(postInput.title)) ||
            !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Please enter valid title' });
        }

        if ((validator.isEmpty(postInput.content)) ||
            !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Please enter valid content' });
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input!");
            error.code = 422;
            error.data = errors;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        });

        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        }
    },

    posts: async function ({ page }, req) {
        const currentPage = +page || 1;
        const perPage = 2;
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }

        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage)
            .populate('creator');
        return {
            posts: posts.map(p => {
                return {
                    ...p._doc,
                    _id: p._id.toString(),
                    createdAt: p.createdAt.toISOString(),
                    updatedAt: p.updatedAt.toISOString()
                }
            }),
            totalPosts: totalPosts
        }
    },

    post: async function ({ id }, req) {
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }

        const totalPosts = await Post.find().countDocuments();
        const post = await Post.findById(id)
            .populate('creator');
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }
    },

    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }
        const errors = [];
        if ((validator.isEmpty(postInput.title)) ||
            !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Please enter valid title' });
        }

        if ((validator.isEmpty(postInput.content)) ||
            !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Please enter valid content' });
        }

        if (errors.length > 0) {
            const error = new Error("Invalid input!");
            error.code = 422;
            error.data = errors;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error("post not found!");
            error.code = 401;
            throw error;
        }

        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('User not authorized to update!');
            error.statusCode = 403;
            throw error;
        }

        post.title = postInput.title;
        post.content = postInput.content;
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }

        const updatedPost = await post.save();
        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        }
    },

    deletePost: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }

        const post = await Post.findById(id);
        if (!post) {
            const error = new Error("post not found!");
            error.code = 401;
            throw error;
        }

        if (post.creator.toString() !== req.userId) {
            const error = new Error('User not authorized to update!');
            error.statusCode = 403;
            throw error;
        }

        clearImage(post.imageUrl);
        await Post.findByIdAndDelete(id);
        user.posts.pull(id);
        await user.save();
        return true;
    },

    user: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }
        return {
            ...user._doc,
            _id: user._id.toString()
        }
    },

    updateStatus: async function ({ status }, req) {
        if (!req.isAuth) {
            const error = new Error('Not Authenticated!');
            error.code = 401;
            throw error;
        }

        if (validator.isEmpty(status)) {
            const error = new Error("Invalid input!");
            error.code = 422;
            error.data = [{ message: 'Please enter status' }];
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User not found!");
            error.code = 401;
            throw error;
        }
        user.status = status;
        await user.save();
        return {
            ...user._doc,
            _id: user._id.toString()
        }
    }
}