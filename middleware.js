module.exports.setCurrentUser = (req, res, next) => {
  res.locals.currUser = req.user; 
  next();
};


module.exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in first!");
  res.redirect("/login");
};


// module.exports.isOrphanage = (req, res, next) => {
//   if (req.isAuthenticated() && req.user.role === "orphanage") {
//     return next();
//   }
//   //req.flash("error", "Access denied. Orphanage only.");
//   res.redirect("/");
// };


// module.exports.isDonor = (req, res, next) => {
//   if (req.isAuthenticated() && req.user.role === "donor") {
//     return next();
//   }
//   //req.flash("error", "Access denied. Donor only.");
//   res.redirect("/");
// };

// module.exports.isAdmin = (req, res, next) => {
//   if (req.isAuthenticated() && req.user.role === "admin") {
//     return next();
//   }
//   //req.flash("error", "Access denied. Admin only.");
//   res.redirect("/");
// };
