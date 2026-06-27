import $ from "dom7";
import Framework7, { getDevice } from "./framework7-custom.js";

import "../css/framework7-custom.less";
import "../css/icons.css";
import "../css/app.less";

import capacitorApp from "./capacitor-app.js";
import routes from "./routes.js";
import store from "./store.js";
import App from "../app.f7";

var app = new Framework7({
  name: "BerkahPOS",
  theme: "auto",
  el: "#app",
  component: App,
  store: store,
  routes: routes,
  input: {
    scrollIntoViewOnFocus: true,
    scrollIntoViewCentered: true,
  },
  statusbar: {
    iosOverlaysWebView: true,
    androidOverlaysWebView: false,
  },
  on: {
    init: function () {
      var f7 = this;
      if (f7.device.capacitor) {
        capacitorApp.init(f7);
      }
      f7.navigate = (path) => f7.views.main.router.navigate(path);
      f7.back = () => f7.views.main.router.back();

      // Cek token setelah F7 siap
      import("./api.js").then(async (api) => {
        const token = await api.getToken();
        const user = await api.getUser();
        console.log(
          "Init check - token:",
          token ? "ada" : "kosong",
          "user:",
          user ? "ada" : "kosong",
        );

        if (token && user) {
          f7.store.dispatch("setAuth", { token, user });
          console.log("Redirect ke beranda...");
          f7.views.main.router.navigate("/beranda/");
        }
      });
    },
  },
});

window.f7 = app;
console.log("F7 siap:", app);
