/**
 * Created by dieudonn on 01/06/2017.
 */
//Enable non strict ssl website
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const Browser = require("zombie"),
  program = require('commander'),
  version = require('./package.json').version,
  assert = require("assert");

program
  .version(version)
  .usage('connect to agate')
  .option('-u, --username <username>', 'janus (sesame) username')
  .option('-p, --password <password>', 'janus (sesame) password')
  .parse(process.argv);

const today=new Date(),
  todayFr=today.toISOString().split('-'),
  fullFirstDay = `${todayFr[0]}-${todayFr[1]}-01`,
  lastDay = new Date(today.getFullYear(), today.getMonth()+1, 1),
  fullLastDay = lastDay.toISOString().split('T')[0];

browser = new Browser();
// browser.proxy = "http://proxyout.inist.fr:8080";
browser.waitDuration = '30s';

browser.visit("https://ups76-1.agateb.cnrs.fr").then(function () {

  browser.fill("#username", program.username);
  browser.fill("#password", program.password);

  // browser.document.forms[0].submit();
  // // wait for new page to be loaded then fire callback function
  // return browser.wait()
  return browser.pressButton('submit');
}).then(function() {
  let a = browser.url, // OR browser.document.querySelector("#barre_outils li:last-child a").getAttribute("href"),
    reg = /user_id=([0-9]{1,10})/,
    userId = reg.exec(a)[1];
  let monthUrl = `https://ups76-1.agateb.cnrs.fr/index.php?controller=Pointage/Feuille&action=showTempsTheorique&date_debut=${fullFirstDay}&date_fin=${fullLastDay}&user_id=${userId}`
  return browser.visit(monthUrl);
}).then(function () {
  let result;
  //Check if day is not ferie
  if(browser.document.querySelector(".jour_courant").classList.contains("ferie")){
    result = "Aujourd'hui c'ets jour férié, on ne travaille pas :)";
    return result;
  }
  const baseDay = 507; //timestamp
  let entree = browser.document.querySelector(".jour_courant .pointage span").getAttribute("data-entree").split(".")[0],
    sortie = new Date((+entree + baseDay)*1000),
    sortieTime = `Aujourd'hui tu peux sortir à ${sortie.getMinutes()}H${sortie.getSeconds()}`;
  let getInfosbonusMalus = browser.document.querySelector("#fiche_pointage tfoot .diff.ui-state-default").textContent.trim().split("h"),
    previousMonth = browser.document.querySelector("#recap_mensuel tbody tr:nth-child(2) td:nth-child(2)").textContent.trim().split("h"),
    isNegativePrevious = previousMonth.indexOf("-"),
    isNegativeMonth = getInfosbonusMalus.indexOf("-"),
    nbOfHoursInMore = (isNegativeMonth ? -getInfosbonusMalus[0] : +getInfosbonusMalus[0]) + (isNegativePrevious ? -previousMonth[0] : +previousMonth[0]),
    nbOfMinutesInMore = (isNegativeMonth ? -getInfosbonusMalus[1] : +getInfosbonusMalus[1]) + (isNegativePrevious ? -previousMonth[1] : +previousMonth[1]);
  let totalMinutes = nbOfMinutesInMore + (nbOfHoursInMore*60),
  totalTime = `Tu as cumulé ${(totalMinutes/60).toFixed()}H${totalMinutes%60}`;
  return {sortieTime, totalTime};
}).then(function (result) {
  console.log(result.sortieTime);
  console.log(result.totalTime);
});
