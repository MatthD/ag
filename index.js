/**
 * Created by dieudonn on 01/06/2017.
 */
//Enable non strict ssl website
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const Browser = require("zombie"),
  program = require('commander'),
  promptPassword = require('prompt-password'),
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
browser.proxy = process.env.http_proxy  || "";
browser.waitDuration = '30s';


browser.visit("https://ups76-1.agateb.cnrs.fr").then(function () {

  browser.fill("#username", program.username);

  if(!program.password){
    let prompt = new promptPassword({
      type: 'password',
      message: 'Entrer votre mot de passe Janus',
      name: 'password'
    });
    return prompt.run()
  }
}).then(function (password) {
  browser.fill("#password", password || program.password);

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
  let info,
    jourCourant = browser.document.querySelector(".jour_courant");
  //Check if day is not ferie
  if(jourCourant.classList.contains("ferie")){
    info = "Aujourd'hui c'est jour férié, on ne travaille pas :)";
  }
  if(jourCourant.classList.contains("chome")){
    info = "Aujourd'hui c'est chomé! Pas de taff."
  }
  if(!info){
    const baseDay = 507; //timestamp
    let entree = browser.document.querySelector(".jour_courant .pointage span").getAttribute("data-entree").split(".")[0],
      sortie = new Date((+entree + baseDay)*1000);
    info = `Aujourd'hui tu peux sortir à ${sortie.getMinutes()}H${sortie.getSeconds()}`;   
  }
  let currentMonth = browser.document.querySelector("#fiche_pointage tfoot .diff.ui-state-default").textContent.trim().split("h"),
    previousMonth = browser.document.querySelector("#recap_mensuel tbody tr:nth-child(2) td:nth-child(2)").textContent.trim().split("h"),
    //Check if previousMonth & currentMonth ahs positiv or negativ value
    isNegativePreviousMonth = false,
    isNegativeCurrentMonth = false;


  // We need to cast string value to real number & if they are negative we double cast them
  // !!!!we cannot just do - directly to cast negatif , not working

  for(var i = 0; i < previousMonth.length ; i++){
    if(previousMonth[i].includes("-")){
      isNegativePreviousMonth = true;
    }
    previousMonth[i] = +previousMonth[i];
  }
  for(var i = 0; i < currentMonth.length ; i++){
    if(currentMonth[i].includes("-")){
      isNegativeCurrentMonth = true;
    }
    currentMonth[i] = +currentMonth[i];
  }

  if(isNegativePreviousMonth){
    previousMonth[1] = -previousMonth[1];
  }
  if(isNegativeCurrentMonth){
    currentMonth[1] = -currentMonth[1];
  }

  let nbOfHoursDiff = previousMonth[0] + currentMonth[0],
    nbOfMinutesDiff= previousMonth[1] + currentMonth[1];

  let allMinutes = nbOfMinutesDiff + (nbOfHoursDiff*60),
    totalMinutes = allMinutes%60,
    totalHours = Math.trunc(allMinutes/60);
  //convert on 2 bits number
  let totalTime = `Tu as ${Object.is(totalHours, -0) || totalHours < 0 ? "un retard" : "une avance"} de ${Math.abs(totalHours)} Heure(s) et ${Math.abs(totalMinutes)} mn`;
  return {info, totalTime};
}).then(function (result) {
  console.log(result.info);
  console.log(result.totalTime);
});
