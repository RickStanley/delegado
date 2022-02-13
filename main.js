import { attachTo, delegate, delegateMany } from "./mod.js";
(() => {

  attachTo(document.querySelector("button"), ["click"]);
  delegateMany(
    "click",
    [
      (event) => {
        console.log("hello 1!");
      },
      (event) => {
        console.log("hello 2!");
      },
      (event) => {
        console.log("hello 3!");
      },
      (event) => {
        console.log("hello 4!");
      },
      (event) => {
        console.log("hello 5!");
      },
      (event) => {
        console.log("hello 6!");
      },
      (event) => {
        console.log("hello 7!");
      },
      (event) => {
        console.log("hello 8!");
      },
    ],
    document.querySelector("button"),
    "do"
  );

  botao.onclick = () => {
    document.querySelector("button").remove();
  };
})();
