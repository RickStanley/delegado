import { attachEvents, delegateManyWithAction, delegate } from "./mod.js";
(() => {

  attachEvents(document.getElementById("removable"), ["click"]);
  delegateManyWithAction(
    document.getElementById("removable"),
    "click",
    "do:log",
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
    ]
  );

  attachEvents(document.getElementById("unremovable"), ["click"]);
  delegate(document.getElementById("unremovable"), "click", () => {
    document.getElementById("removable")?.remove();
  });
})();
