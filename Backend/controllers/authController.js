const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Community=require('../models/Community');
const { v2: cloudinary } = require('cloudinary')

// @desc Login
// @route POST /auth
// @access Public
const login = async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' })
    }
    //if you don't use exec() its fine.by using this  but you get a better stack trace if any error happened
    const foundUser = await User.findOne({ email }).exec()

    if (!foundUser) {
        return res.status(401).json({ message: 'Unauthorized // user not found in db' })
    }

    const match = await bcrypt.compare(password, foundUser.password)

    if (!match) return res.status(401).json({ message: 'Unauthorized // wrong password' })

    const accessToken = jwt.sign(
        {
            "UserInfo": {
                "email": foundUser.email,
                "roles": foundUser.roles
            }
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
        { "email": foundUser.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    )

    // Create secure cookie with refresh token 
    res.cookie('jwt', refreshToken, {
        httpOnly: true, //accessible only by web server
        secure: true, //https
        sameSite: 'None', //cross-site cookie 
        maxAge: 7 * 24 * 60 * 60 * 1000 //cookie expiry: set to match rT
    })

    // Send accessToken containing email
    res.json({ accessToken })
}



// @desc signup
// @route POST /auth/signup
// @access public
const signup = async (req, res) => {
    const { name, password, email, phoneNumber, city, address, postalCost } = req.body;

    if (!name || !password || !email || !phoneNumber || !city || !address || !postalCost) {
        return res.status(400).json({ message: "all fields are required" });
    }

    const foundEmail = await User.findOne({ email }).lean().exec();
    if (foundEmail) {
        return res.status(409).json({ message: 'duplicate email' });
    }

    const foundPhoneNumber = await User.findOne({ phoneNumber }).lean().exec();
    if (foundPhoneNumber) {
        return res.status(409).json({ message: 'duplicate phone number' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userObject = { name, email, password: hashedPassword, phoneNumber, city, address, postalCost };

    const user = await User.create(userObject);
    // const existingCommunity=await Community.findOne({communityName:address});
    console.log("yahan tak")
    
        await Community.create({communityName:address});
        console.log("uiuu")
        const community = await Community.findOneAndUpdate(
            { communityName: address },
            { $push: { userInCommunity: user._id } },
            { new: true}
        ).populate('userInCommunity').exec();
        console.log(community);
    
   
    
  
    
    

    
    
    
        
    

    if (user) {
        res.status(201).json({ message: `${user.name} created with ${user.email}` });
    } else {
        res.status(400).json({ message: 'invalid user data received' });
    }
};




// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = async (req, res) => {
    const cookies = req.cookies

    if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized \\ refresh jwt not found in refresh back' })
    // surely user delete jwt from cookies

    const refreshToken = cookies.jwt

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Forbidden // your login has expired' })

            const foundUser = await User.findOne({ email: decoded.email }).exec()

            if (!foundUser) return res.status(401).json({ message: 'Unauthorized' })
            // user must change user from jwt

            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "email": foundUser.email,
                        "roles":foundUser.roles
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '15m' }
            )

            res.json({ accessToken })
        }
    )
}



// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = async (req, res) => {
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(204) //No content
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.json({ message: 'Cookie cleared' })
}



// @desc generateSignature
// @route POST /auth/generateSignature
// @access public
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});
const generateSignature = (req, res) => {
    const { folder } = req.body
    if (!folder) {
        res.status(400).json({ message: 'unexpected error' })
    }
    const timestamp = Math.round((new Date).getTime() / 1000)
    const signature = cloudinary.utils.api_sign_request({
        timestamp,
        folder
    }, process.env.CLOUDINARY_API_SECRET)
    res.status(200).json({ timestamp, signature });
}



// @desc uploadDocumentUrl
// @route PUT /auth/uploadDocumentUrl
// @access public
const uploadDocumentUrl = async (req, res) => {
    const {aurl,purl} = req.body;
    const email = req.email
    // console.log(email)
    if(!aurl || !purl){
        return res.status(400).json({ message: 'document Url not found' })
    }
    if(!email){
        return res.status(403).json({message:"email not found in web token"})
    }
    const foundUser = await User.findOne({email}).exec()
    
    if (!foundUser) return res.status(401).json({ message: 'Unauthorized' })

    foundUser.panUrl = purl
    foundUser.aadharUrl = aurl
    foundUser.verification = "I"

    await foundUser.save()

    res.status(200).json({message:"document upload successfully"})
}



module.exports = {
    login,
    refresh,
    logout,
    signup,
    generateSignature,
    uploadDocumentUrl
}