import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeOkfColor } from "../../../src/core/security/spanColors";

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("the colour grammar accepts hex and bounded rgb()/rgba()", () => {
  for (const good of ["#c00", "#c00f", "#cc0000", "#CC000080", "rgb(0, 128, 255)", "rgb(10%,20%,30.5%)",
    "rgba(1,2,3,0.5)", "rgba(1,2,3,.5)", "rgba(1,2,3,1)", "rgba(1,2,3,50%)"]) {
    assert.equal(isSafeOkfColor(good), true, good);
  }
  for (const bad of ["#cc", "#ccccc", "#ggg", "rgb(256,0,0)", "rgb(0,0,101%)", "rgb(0,0)", "rgb(0,0,0,0)",
    "rgba(0,0,0)", "rgba(0,0,0,1.5)", "rgb(-1,0,0)", "rgb(0,0,0) !important", "#c00 !important",
    "var(--x)", "url(x)", "expression(1)", "rgb(0,0,0/**/)", "rgb(var(--a),0,0)", "rgb(0,0,0);x", "",
    "rgb(1e2,0,0)", "rgb(0,0,0)rgb(0,0,0)"]) {
    assert.equal(isSafeOkfColor(bad), false, bad);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("the colour grammar accepts names from a closed list and hsl()/hsla()", () => {
  for (const good of ["red", "RebeccaPurple", "transparent", " white ", "hsl(120, 100%, 50%)", "hsl(120deg,100%,50%)",
    "hsla(0, 0%, 0%, 0.5)", "hsla(360,10.5%,20%,50%)", "HSL(0,0%,0%)"]) {
    assert.equal(isSafeOkfColor(good), true, good);
  }
  for (const bad of ["redd", "ButtonText", "revert", "auto", "red red", "hsl(361,0%,0%)",
    "hsl(0,0,0)", "hsl(0,101%,0%)", "hsl(0,0%,0%,0.5)", "hsla(0,0%,0%)", "hsla(0,0%,0%,2)",
    "hsl(0,0%,0%/**/)", "hsl(var(--h),0%,0%)", "hsl(0turn,0%,0%)", "hsl(0,0%,0%) !important"]) {
    assert.equal(isSafeOkfColor(bad), false, bad);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("the colour grammar refuses every injection shape", () => {
  const injections = [
    "var(--x)", "red; background: url(x)", "red}body{color:red", "red{", "red\\", "\\72ed", "r\\65 d", "re\\\nd",
    "url(https://evil/x)", "expression(alert(1))", "red !important", "red!important", "#fff !important", "red /* c */",
    "/**/red", "red//", "rgb(0,0,0)/**/", "rgb(0,0,0) ;", "rgb(0,0,0)}", "rgb(0,0,0\\)", "rgb(0,\\30,0)",
    "rgb(var(--a),0,0)", "rgb(calc(1+1),0,0)", "rgb(0,0,0,0", "rgb((0),0,0)", "\"red\"", "'red'", "red\u0000",
    "red\n;x:y", "red\tblue", "-moz-binding:url(x)", "image-set(red)", "light-dark(red,blue)", "color-mix(in srgb,red,blue)",
    "#fff;x", "#ff0000ff0", "#12", "rgb(1,2,3);color:red", "hsl(0,0%,0%);x", "env(x)", "attr(x)", "red url(x)", "RED́",
    "rgb(0,0,0)​", "rеd",
  ];
  for (const bad of injections) assert.equal(isSafeOkfColor(bad), false, JSON.stringify(bad));
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-034
test("the colour grammar accepts the space form and four keywords, strictly", () => {
  for (const good of ["rgb(0 0 0)", "rgb(10% 20% 30%)", "rgb(0 0 0 / 50%)", "rgba(1 2 3 / .5)", "rgb(1 2 3/0.5)",
    "hsl(120 100% 50%)", "hsl(120deg 100% 50% / 0.4)", "hsla(0 0% 0% / 1)", "currentcolor", "CurrentColor", "inherit",
    "initial", "unset"]) {
    assert.equal(isSafeOkfColor(good), true, good);
  }
  for (const bad of ["rgb(0, 0 0)", "rgb(0 0, 0)", "rgb(0 0 0, 0.5)", "rgb(0 0 0 0.5)", "rgb(0 0 0 / )", "rgb(0 0 0 / 2)",
    "rgb(0 0 0 / 0.5 / 1)", "rgb(0 0)", "rgb(256 0 0)", "rgb(0 0 101%)", "hsl(361 0% 0%)", "hsl(0 0 0)", "hsl(0 101% 0%)",
    "hsl(0 0% 0% / 101%)", "rgb(-1 0 0)", "rgb(0 0 0 /* x */)", "rgb(0 0 0) !important", "rgb(var(--a) 0 0)",
    "rgb(0\n0 0)", "rgb(1e2 0 0)", "inherit !important", "unset;x", "revert", "inherit inherit", "rgb(0 0 0 / 0.5;x)"]) {
    assert.equal(isSafeOkfColor(bad), false, JSON.stringify(bad));
  }
});
