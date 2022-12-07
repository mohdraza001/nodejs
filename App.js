const express = require('express');//it is used  for fetch express module and function
const exphbs = require('express-handlebars');//used for ui design
const cookieParser = require('cookie-parser');// it is used for temp data storage for client side
const mongoose = require('mongoose');//mongoose is create for to connect to database 
const seceret = "assd123^&*^&*ghghggh";//it is a secret key for session
const oneDay = 1000 * 60 * 60 * 24; // it is a time  duration for session 
const sessions = require('express-session');// it is used for session 
const PORT = 9999;//it is port number 
const bcrypt = require('bcrypt');//it is used for encryption
const hbs = require('nodemailer-express-handlebars');//it is used for mail with handlebars
const saltRounds = 10;//for encryption
const app = express();
//const { body, validationResult } = require('express-validator');
const { check ,validationResult} = require('express-validator');
const path = require('path')//it is required the path of the folder
app.use('/static', express.static(path.join(__dirname, 'public')))
const crypto=require('crypto');//it used for create token
//const bodyparser = require('body-parser')
//var csrf=require('csurf');


//database connection
mongoose.connect("mongodb://localhost:27017/authmailer")
    .then(res => console.log("MongoDB Connected"))
    .catch(err => console.log("Error : " + err));
//end
//init the session witth some screat and max time duration for session
app.use(sessions({
    secret: seceret,
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}))
app.use(express.json());//it is middleware for json 
app.use(express.urlencoded({ extended: false }));
app.engine('handlebars', exphbs.engine())
app.set('view engine', 'handlebars');//set view engine for handlebars
app.set('views', './views');//set the folder where habdlebars file available
app.use(cookieParser());//it is middleware for json
const userModel = require('./model/User');//it is schema for database (usermodel detail)
const tokenModel=require('./model/tokenModel');//it is schema for database (tokenmodel detail)
const nodemailer = require("nodemailer");// it is used for mail
const multer  = require('multer')//it is used for stroage file in particular folder
const { isTemplateLiteralToken } = require('typescript');

var session;
//it is for connect to gmail through app password port number 587
let transporter=nodemailer.createTransport({
    service:"gmail",
    port:587,
    secure:false,
    auth:{
        user:"razamohd371@gmail.com",
        pass:"ywtlwuqpfkoidipp"
    }
});
transporter.use('compile',hbs(
    {
        viewEngine:"nodemailer-express-handlebars",
        viewPath:"views/emailTemplates/"
    }
))// it is middleware for viewing a email templete file
//----------------------------------------------------------------------------------------
//it is used for storage file in particular folder
const storage=multer.diskStorage({
    destination:function(req,file,cb){
      cb(null,path.join(__dirname,"/public"))
    },
    filename:function(req,file,cb){
        fileExtension=path.extname(file.originalname);
        cb(null,file.fieldname+"-"+Date.now()+fileExtension)

    }
})
//it is used for checking file ext.
const upload=multer({storage:storage,
    fileFilter:(req,file,cb)=>{
        if(file.mimetype=="image/png" || file.mimetype=="image/jpeg"){
           cb(null,true)
        }
        else{
            cb(null,false);
             cb(new Error("Only png and jpg formet allowed"))
        }
    }});
    //it is fetch input from upload image form
const uploadSingle=upload.single("att");
// app.post("/uploadfile",(req,res)=>{
//     uploadSingle(req,res,(err)=>{
//        if(err){
//         return res.status(400).send({message:err.message})
//        }
//        else {
//          return res.send(req.file);
//        }
//     })
// })
// app.get("/upload",(req,res)=>{
//     res.render("upload");
// })
// -------------------------------------------------------------------------------
// it is render the home handlebars as front page of the website
app.get("/", (req, res) => {
        return res.render("home")
})
// it is used for login page rendering  and if you already login then you are not login again bez it is auto login throw session.
app.get("/login", (req, res) => {
    let auth = req.query.msg ? true : false;
   let username=req.session.username;
    if (auth) {
        return res.render("login", { error: 'Invalid username or password' });// if any kind for error arise then it is pop on the screen
    }
    else if(username){
        return res.redirect(`/welcome?uname=${username}`)//auto login if you are in the session
    }
    else{
        res.render("login");//rendering login if you are not in session
    }
})
app.post("/postlogin", (req, res) => { //it login side post
    let { uname, password } = req.body;
    userModel.findOne({ username: uname }, (err, data) => { // it is find the uname
        if (err) {
            return res.redirect("/login?msg=fail");// if there is any error then it throw error
        }
        else if (data == null) {
            return res.redirect("/login?msg=fail");//if data is not find on the server then it throw error
        }
        else {
            if (bcrypt.compareSync(password, data.password)) {//it is check the password with server passward
                session = req.session;// it is create a session 
                session.username = uname;//it is put data of uname in session
                console.log(req.session);
                return res.redirect(`/welcome?uname=${uname}`);// it is redirect to welcome 
            }
            else {
                return res.redirect("/login?msg=fail");//if campare password fail then it redirect to login with error massage
            }
        }
    })


})
app.get("/regis", (req, res) => {//it is render the regis page
    res.render("regis");
})
app.post("/postregis",check("password").isLength({min:5}).withMessage('must be at least 5 chars long'),(req, res) => { // sbmit the 
    const error=validationResult(req);
    if(!error.isEmpty()){
        return res.status(400).json(error.array())
    }
    else{
    uploadSingle(req,res,(err)=>{
    if(err){
        res.render("regis", { error:"fail to upload" })
    }
    else
    {
    let { email,uname, password} = req.body;
    const hash = bcrypt.hashSync(password, saltRounds);
    userModel.create({ username: uname,email:email,password: hash,status:0,image:req.file.filename})
    .then(data => {
            let mailOptions={
                from:'razamohd371@gmail.com',
                to:[`${email}`],
                subject:"Verify eMail",
                template:'mail',
                context:{username:uname,email:email,_id:data._id
                }
            }
            transporter.sendMail(mailOptions,(err,info)=>{
                if(err){ console.log(err)}
                else{
                     console.log("Mail send : "+info)
                }
            })
            res.redirect("/login")
        })
        .catch(err => {
            res.render("regis", { error: "User Already Registered" })
        })
    }
})
    }

})
app.get("/activateaccount/:id",(req,res)=>{
    let username=req.params.id; 
    userModel.updateOne({_id:username},{$set:{status:1}},(err)=>{
        if(err){ console.log("Error")}
        else {
            res.render("login",{sucMsg:"Account Activated"});
        }
    })
})
//for render the page of reset passoword
app.get("/resetpass",(req,res)=>{
    res.render("reset");
})
app.get("/welcome", async(req, res) => {
    //let username=req.cookies.username;
    let unamea=req.query.uname;
    let datawel= await userModel.findOne({username:unamea})
     console.log(datawel);
    let username = req.session.username;
    if (username) {
        return res.render("welcome", { username: username,image:datawel.image})
    }
    else {
        return res.redirect("/login");
    }
})
app.get("/resetpassword",(req,res)=>{//mail side data get
    res.render("resetaccount",{uid:req.query.id,token:req.query.token})
})
app.post("/postresetpassword",async(req,res)=>{
    let {id,token,password}=req.body;
    let tokenpass=await tokenModel.findOne({userId:id})
    if(!tokenpass){
        res.render("login",{error:"Token is expired"});
    }
    const isvalid=await bcrypt.compare(token,tokenpass.token)
    if(!isvalid){
        res.render("login",{error:"token Expired and Click again on reset your password"});
       // res.send("token Expired and Click again on reset your password");
    }
    const hash=await bcrypt.hash(password,Number(saltRounds));
    await userModel.updateOne({
        _id:id},{$set:{password:hash}},{new:true}
    );
    return res.render("login",{succMsg:"Password Changed"})
})
app.post("/postreset",async (req,res)=>{
    let {email}=req.body;
    let user=await userModel.findOne({email:email})
    if(user){
        let token=await tokenModel.findOne({userId:user._id})
        if(token) await tokenModel.deleteOne();
        let resttoken=crypto.randomBytes(32).toString("hex");
        const hash=await bcrypt.hash(resttoken,Number(saltRounds));
        await new tokenModel({
            userId:user._id,
            token:hash,
            createdAt:Date.now()
        }).save();
        let mailOptions={
            from:'razamohd371@gmail.com',
            to:[`${email}`],
            subject:"Reset Password",
            template:'reset',
            context:{email:email,_id:user._id,token:resttoken
            }
        }
        transporter.sendMail(mailOptions,(err,info)=>{
            if(err){ console.log(err)}
            else{
                 console.log("Mail send : "+info)
                 res.render("login",{sucMsg:`Mail sended on ${email}`});
            }
        })
    }
    else{
        res.render("login",{error:"Email is not exists"});
    } 
    
})
app.get("/logout", (req, res) => {
    //res.clearCookie("username");
   // res.clearCookie('connect.sid');
    req.session.destroy((err) => {
        res.clearCookie('connect.sid');//it is clear the cookie after logout
        res.redirect("/");// will always fire after session is destroyed
      })
})
app.get("/delete/:uname",(req,res)=>{
    let uname=req.params.uname;
   userModel.findOneAndDelete({username:uname},(err)=>{
    if (err) throw err;
    else
    res.render("login",{error:"YOUR PROFILE IS DELELTE"})
   })
})
app.get("/changepassword/:username",(req,res)=>{
    let username=req.params.username;
    res.render("changepasswelcome",{username})
})
app.post("/changepasswt",async(req,res)=>{
let{oldpass,newpass,username}=req.body;
   const userdata= await userModel.findOne({username:username});
        const isValid= bcrypt.compare(oldpass,userdata.password);  
        if(isValid){
             const hash = bcrypt.hashSync(newpass, saltRounds);
            userModel.updateOne({username:username},{$set:{password:hash}},{new:true},(err)=>{
                if(err) throw console.log(err);
                else req.session.destroy((err)=>{
                    res.clearCookie('connect.sid');//it is clear the cookie after logout
                })
            })
        
    }
    res.render("login",{sucMsg:"YOUR PASSWORD CHANGED"});
})
app.get("*",(req,res)=>{
    res.render("404");
})
app.listen(PORT, (err) => {
    if (err) throw err
    else {
        console.log(`Server work on ${PORT}`)
    }
})