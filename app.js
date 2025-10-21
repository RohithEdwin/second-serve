if(process.env.NODE_ENV != "production"){
    require('dotenv').config();
}
//Required modules
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require('passport');
const MongoStore = require("connect-mongo");
const LocalStrategy = require("passport-local").Strategy;
const {setCurrentUser, isLoggedIn} = require("./middleware.js");

//Models
const Donor = require("./models/donors.js");
const Org = require("./models/orphanages.js");
const Donation = require("./models/donation.js");

//App Config
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}))
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

//Database Config
const dbUrl = process.env.MONGO_URL
async function main(){
    await mongoose.connect(dbUrl);
}
main()
    .then(() => {
        console.log("Yes!! connected to DB");
    })
    .catch((err) => {
     console.log(err);
    });

//Session Store
const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: { secret: process.env.SECRET},
    touchAfter: 24 * 60 * 60
});

// Session Config
app.use(session({
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));
app.use(flash());

//Passport Config
app.use(passport.initialize());
app.use(passport.session());
passport.use("local", new LocalStrategy(
    async(username, password, done) => {
        try{
            // Check in Donor collection (includes admin)
            let user = await Donor.findOne({username: username});
            if(user){
                const authenticated = await user.authenticate(password);
                if (authenticated.user) {
                    return done(null, authenticated.user);
                }
            }

            // Check in Orphanage collection
            user = await Org.findOne({ username: username });
            if (user) {
                const authenticated = await user.authenticate(password);
                if (authenticated.user) {
                    return done(null, authenticated.user);
                }
            }
            
            return done(null, false, { message: 'Invalid username or password' });
        } catch (error) {
            return done(error);
        }
    }
));
passport.serializeUser((user, done) => {
    let model = 'Org';
    if (user.role === 'donor' || user.role === 'admin') {
        model = 'Donor';
    }
    done(null, { id: user._id, model: model });
});
passport.deserializeUser(async (data, done) => {
    try {
        let user;
        if (data.model === 'Donor') {
            user = await Donor.findById(data.id);
        } else {
            user = await Org.findById(data.id);
        }
        done(null, user);
    } catch (error) {
        done(error);
    }
});
app.use(setCurrentUser);
//Flash Middleware
app.use((req, res, next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

//Root Route
app.get("/", 
    setCurrentUser, isLoggedIn,
    (req,res)=>{
    if(req.user){
        if (req.user.role === 'admin') {
            return res.redirect("/admin/dashboard");
        } else if (req.user.role === 'orphanage') {
            return res.redirect("/orphanage/dashboard");
        } else {
            return res.redirect("/donor/index");
        }
    }
});

//All Authentication Routes
    //Donor Signup Route
app.get("/signup-donor", (req,res)=> {
    if(req.user){
        res.redirect("/");
    }
    res.render("users/donorSignup.ejs");
});

app.post("/signup-donor", async(req,res) => {
    try{
        // If user exists
        const {username,email,password,phone,role} = req.body;
        const existingUser = await Donor.findOne({ 
            $and: [{ username }, { email }] 
        });
        if(existingUser){
            req.flash('error', 'User already exists with this email or username');
            return res.redirect("/login");
        }

        // If new user
        const newDonor = new Donor ({ username, email, password, phone, role})
        const registeredDonor = await Donor.register(newDonor,password);
         req.login(registeredDonor, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Account created successfully! Welcome to Second Serve');
            return res.redirect("/donor/index");
            });
    } catch (e) {
        console.log(e);
        req.flash('error', 'Error creating account. Please try again.');
        return res.redirect("/signup-donor");
    }
});

    //Orphanage Signup Route
app.get("/signup-org", (req,res)=> {
    if(req.user){
        return res.redirect("/");
    }
    res.render("users/orphanageSignup.ejs");
});

app.post("/signup-org",async(req,res) => {
    try{
        // If Orphanage exists
        const {username,email,password,phone} = req.body
        const existingUser = await Org.findOne({ 
            $and: [{ username }, { email }] 
        }); 
        if (existingUser) {
            req.flash('error', 'Orphanage already exists with this email or username');
            return res.redirect("/login");
        }

        // New Orphanage
        const newOrg = new Org({username, email, password, phone});
        const registeredOrg = await Org.register(newOrg,password);
        req.login(registeredOrg, (err) => {
            if (err) {
                return next(err);
            }
            req.flash('success', 'Orphanage account created successfully!');
            return res.redirect("/orphanage/dashboard");
        });
    } catch (e) {
        console.log(e);
        req.flash('error', 'Error creating orphanage account. Please try again.');
        return res.redirect("/signup-org");
    }
});

    //Login Route
app.get("/login", (req,res) => {
    if(req.user) {
        return res.redirect("/");
    }
    res.render("users/login.ejs");
});

app.post("/login", 
    passport.authenticate('local',{
        failureRedirect:"/login",
    }), (req,res) => {
        req.flash('success', `Welcome back, ${req.user.username}!`);
        if (req.user.role === 'admin') {
            return res.redirect("/admin/dashboard");
        } else if (req.user.role === 'orphanage') {
            return res.redirect("/orphanage/dashboard");
        } else {
            return res.redirect("/donor/index");
        }
});

    //logout route
app.get("/logout", (req,res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash('success', 'Logged out successfully');
        res.redirect("/login");
    });
})

//Donor All Routes
app.get("/donor/index", 
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const allOrphanages = await Org.find({});
        const donor = req.user._id.toString();
        res.render("donor/orphanages.ejs",{allOrphanages, donor});
});

app.get("/donor/donation-history",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        try{
            const donorId = req.user._id.toString();
            const allDonations = await Donation.find({ donorId }).populate("orphanageId","username");
            res.render("donor/donorDonation.ejs",{allDonations});
            }
        catch(err){
            console.error(err);
            req.flash('error', 'Error fetching donation history');
            res.status(400).send("Error fetching donations: " + err.message);
        }
});

app.get("/donor/edit",
    setCurrentUser, isLoggedIn,
    async(req,res)=> {
        const id = req.user._id.toString()
        const donor = await Donor.findById(id);
        res.render("donor/edit.ejs",{donor});
});

app.post("/donor/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const {id} = req.params;
        const { username, email, phone, } = req.body
        await Donor.findByIdAndUpdate(id, {
             $set: {
                ...(username && { username }),
                ...(email && { email }),
                ...(phone && { phone }),
            }
           })
        req.flash('success', 'Profile updated successfully!');
        res.redirect("/donor/index");
});

app.delete("/donor/delete/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const { id } = req.params;
        await Donor.findByIdAndDelete(id);
        req.flash('success', 'Account deleted successfully');
        res.redirect("/donor/index");
});

app.get("/donor/delete",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const id = req.user._id.toString();
        await Donor.findByIdAndDelete(id);
        req.flash('success', 'Account deleted successfully');
        res.redirect("/login");
});

//Donation Routes
app.get("/:id/donation/:id1", async (req, res) => {
    const donorId = req.user._id.toString();
    const { id1 } = req.params; 
    const orphanage = await Org.findById(id1);
    const donor = await Donor.findById(donorId);
    res.render("donor/donationForm.ejs", { donor, orphanage });
});


app.post("/:id/donation", async (req, res) => {
  try {
    const donorId = req.params.id;
    const newDonation = new Donation({
      donorId: donorId,
      orphanageId: req.body.orphanageId, 
      foodType: req.body.foodType,
      pickupAddress: req.body.pickupAddress,
      pickupDate: req.body.pickupDate,
      pickupTime: req.body.pickupTime,
      donorPhone: req.body.donorPhone
    });
    await newDonation.save();
    req.flash('success', 'Donation request submitted successfully!');
    res.redirect("/donor/index");
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error submitting donation request');
    res.status(400).send("Error saving donation: " + err.message);
  }
});

app.get("/donation/accept/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Donation.findByIdAndUpdate(id,{$set:{
            status:"accepted"
        }})
        req.flash('success', 'Donation accepted successfully');
    res.redirect("/orphanage/donations-request")
});

app.get("/donation/reject/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Donation.findByIdAndUpdate(id,{$set:{
            status:"rejected"
        }});
        req.flash('error', 'Donation request rejected');
    res.redirect("/orphanage/donations-request")
});

app.get("/donation/received/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Donation.findByIdAndUpdate(id,{$set:{
            status:"received"
        }})
        req.flash('success', 'Donation marked as received');
    res.redirect("/orphanage/pending-donation");
});

//Orphanage All routes
app.get("/orphanage/dashboard",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const orphanage = req.user._id.toString();
        res.render("orphanage/dashboard.ejs",{orphanage});
});

app.get("/orphanage/donations-request",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        try{
            const orphanageId = req.user._id.toString();
            const allDonations = await Donation.find({ orphanageId }).populate("donorId","username");
            res.render("orphanage/donation.ejs",{allDonations});
        }
        catch(err){
            console.error(err);
            req.flash('error', 'Error fetching donation requests');
            res.status(400).send("Error fetching donations: " + err.message);
        }
});

app.get("/orphanage/pending-donation",
    setCurrentUser, isLoggedIn,
    async(req,res)=>{
        try{
            const orphanageId = req.user._id.toString();
            const allDonations = await Donation.find({ orphanageId }).populate("donorId","username");
            res.render("orphanage/pendingDonation.ejs",{allDonations});
            }
        catch(err){
            console.error(err);
            req.flash('error', 'Error fetching pending donations');
            res.status(400).send("Error fetching donations: " + err.message);
        }
});

app.get("/orphanage/donation-history",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        try{
            const orphanageId = req.user._id.toString();
            const allDonations = await Donation.find({ orphanageId }).populate("donorId","username");
            res.render("orphanage/donationHistory.ejs",{allDonations});
            }
        catch(err){
            console.error(err);
            req.flash('error', 'Error fetching donation history');
            res.status(400).send("Error fetching donations: " + err.message);
        }
});

app.get("/orphanage/verification",
    setCurrentUser, isLoggedIn, 
    async (req,res)=> {
        const orphanage = await Org.findById(req.user._id.toString());
        res.render("orphanage/registration.ejs",{orphanage})
});

app.post("/orphanage/verification",
    setCurrentUser, isLoggedIn, 
    async(req,res) => {
        const id = req.user._id.toString();
        console.log(id);
        console.log(req.body)
        const { username, description, image, email, phone, address, childrenCount } = req.body
        await Org.findByIdAndUpdate(id, {
             $set: {
                status:"pending",
                ...(username && { username }),
                ...(description && { description }),
                ...(image && { image }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(childrenCount && { childrenCount })
            }
           })
        req.flash('success', 'Verification submitted! Your application is under review.');
        res.redirect("/orphanage/dashboard");
    });

app.get("/orphanage/edit",
    setCurrentUser, isLoggedIn,
    async(req,res)=> {
    const orphanage = await Org.findById(req.user._id.toString());
    res.render("orphanage/edit.ejs",{orphanage});
})

app.post("/orphanage/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const {id} = req.params;
        const { username, description, image, email, phone, address, childrenCount } = req.body
        await Org.findByIdAndUpdate(id, {
             $set: {
                ...(username && { username }),
                ...(description && { description }),
                ...(image && { image }),
                ...(email && { email }),
                ...(phone && { phone }),
                ...(address && { address }),
                ...(childrenCount && { childrenCount })
            }
           })
        req.flash('success', 'Orphanage profile updated successfully!');
        res.redirect("/orphanage/dashboard");
});

//Admin Routes
app.get("/admin/dashboard",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        res.render("admin/dashboard.ejs");
});

app.get("/admin/pending-org",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const allOrphanages = await Org.find({});
        res.render("admin/pendingOrg.ejs",{allOrphanages});
});

app.get("/admin/verify/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Org.findByIdAndUpdate(id,{$set:{
            status:"verified"
        }})
        req.flash('success', 'Orphanage verified successfully');
    res.redirect("/admin/pending-org")
});

app.get("/admin/reject/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Org.findByIdAndUpdate(id,{$set:{
            status:"rejected"
        }});
        req.flash('error', 'Orphanage verification rejected');
    res.redirect("/admin/pending-org")
});

app.get("/admin/reject1/:id",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        let {id} = req.params;
        await Org.findByIdAndUpdate(id,{$set:{
            status:"rejected"
        }});
        req.flash('error', 'Orphanage status changed to rejected');
    res.redirect("/admin/verified-org")
});

app.get("/admin/verified-org",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const allOrphanages = await Org.find({});
        res.render("admin/verifiedOrg.ejs",{allOrphanages});
});

app.get("/admin/rejected-org",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const allOrphanages = await Org.find({});
        res.render("admin/rejectedOrg.ejs",{allOrphanages});
});

app.get("/orphanage/delete",
    setCurrentUser, isLoggedIn,
    async(req,res) => {
        const id = req.user._id.toString();
        await Org.findByIdAndDelete(id);
        req.flash('success', 'Orphanage account deleted successfully');
        res.redirect("/login");
});

app.get("/orphanage/:id", 
    setCurrentUser, isLoggedIn,
    async (req,res)=> {
    let {id} = req.params;
    const donorId = req.user._id.toString();
    const orphanage = await Org.findById(id);
    const donor = await Donor.findById(donorId);
    res.render("donor/show.ejs",{orphanage,donor})
});

app.listen(3000, () => {
    console.log("server is listening to port");
})
