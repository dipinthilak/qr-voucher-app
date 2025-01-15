const isLogin = async (req, res, next) => {
    try {
      if (req.session.user) {
        console.log("isLogin>>> user active, so next");
        next();
      } else {
        console.log("isLogin>>> user not-active, so redirecting to /");
        res.redirect("/");
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  
  const isLogout = async (req, res, next) => {
    try {
      if (!req.session.user) {
        console.log("isLogout>>> user not-active, so next");
        next();
      } else {
        console.log("isLogout>>> user active, so redirecting to /home");
        res.redirect("/home");
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  
  module.exports = { isLogin, isLogout };
   