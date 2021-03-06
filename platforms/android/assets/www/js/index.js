/*
 *
 * Ce fichier est notre "Controller" il fera le lien entre Le model (la logique) et le view (vue).
 * Aucun service ne doit être créé ici mais plutot être utiliser ici pour toucher au vue.
 * Tous les bouttons, labels (si je peut le dire comme ça) etc doivent être reliés à un variable ici.
 * Par ex : var btnXXX = document.getElementById("idXXX")
 * Il ne faut pas utiliser de <<document.getElementById("idXXX")>> dans une fonction
 * mais plutôt la variable (ex: btnXXX ou labelXXX) pour eviter des erreurs et un code confus.
 * Et pour chaque btnXXX creer un btnXXXAction() qui sera la fonction exécuter
 * quant le bouton est cliqué...
 *
 * Je vous prie donc de respecter ce qui a été écrit en dessus.
 * Quand une convention est respectée, nous comprenons plus rapidement et
 * la modification du code sera beaucoup plus facile à faire.
 */

var app = {
// Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'

    onDeviceReady: function () {
        if (cordova.platformId == 'android') {
            StatusBar.backgroundColorByHexString("#3388CC");
        }

        $("div[data-role='panel']").panel().enhanceWithin();
        //Capture the backbutton pressed event
        document.addEventListener("backbutton", onBackKeyDown, false);
        btncollecterDonnees.addEventListener("click", btncollecterDonneesAction);
        btnArreterReprendre.addEventListener("click", btnArreterReprendreAction);
        btnAnnulerCollecte.addEventListener("click", btnAnnulerCollecteAction);
        btnExporterCollecte.addEventListener("click", btnExporterCollecteAction);
        setTimeout(function () {
            //@pape :ajout
            navigator.splashscreen.hide();

            displayDeviceAndSimInfo();
            setPanelUnderHeader();
//            drawCircle();
            //Delete all data when starting
            clearSavedDataInDB();
            //Hide the 1st chart (of Badiane)
            $('#graphics').hide();
            //call once for printing the view of graphics
            // call take the values and make the graphics
            traceCourbe(tabBattry, tabSignal);
//            make courbe just where device is ready
//            retraceCourbe();

            panelInfo.show();

            //Wait 1 seconde to enable data captures (enable the button corresponding)
            setTimeout(function () {
                $('#homePageFooter').show();
            }, 200);

//            $('#idHomePage').removeClass('ui-body-a');
//            $('#idHomePage').addClass('ui-body-b');
        }, 100);
    }
};
app.initialize();
/********************************* Déclaration de variable **************************************/

/********** Page 1 ***********/
var labelMarque = document.getElementById("marque");
var labelModel = document.getElementById("model");
var labelSerial = document.getElementById("serial");
var labelGSMCode = document.getElementById("gsm");
var labelCarrierName = document.getElementById("carrierName");
var btncollecterDonnees = document.getElementById("btnCollecterDonnees");
/********** Page 2 ***********/
var btnArreterReprendre = document.getElementById("btnStartPauseCollecte");
var btnAnnulerCollecte = document.getElementById("btnAnnulerCollecte");
var btnExporterCollecte = document.getElementById("btnExpCollecte");
var divCircle = document.getElementById("circle");
/********** Panel d'information ***********/
var panelInfo = $("#myPanel");
/********** Variables non view (juste pour garder des valeurs) *************/
var status = 'on';
var processWritting = null;
var processForCourbe = null;
var processCircle = null;
//pour garder les donnees dans des array pour signal et le battry
var tabBattry = [];
var tabSignal = [];
/********************************* Déclaration des fonctions **************************************/

//Affiche les informations du téléphone et de la carte sim à la premiere page
function displayDeviceAndSimInfo() {
    labelMarque.innerHTML = "" + getDeviceMarque();
    labelModel.innerHTML = "" + getDeviceModel();
    labelSerial.innerHTML = "" + getDeviceSerial();
    labelCarrierName.innerHTML = "" + getCarrierName();
    labelGSMCode.innerHTML = "" + getGSMCode();
}


function btncollecterDonneesAction() {
    if (isBatteriePlugged()) {
        //Start collecte cause battery charging is plugged
        $.mobile.changePage("#idMonitoringPage", {transition: "slide"});
        retraceCourbe();
//    startChart();   //canvas chart
        startUpdatingCircle();
        tracerDynamicCourbe();
        playDynamicChart();
        monitoringOnPlay();

    } else {
        //Battery is not charging so alert
        showAlert("Assurer vous que votre téléphone est en mode charge puis relancez la collecte");
    }
}

function btnArreterReprendreAction() {
    if (status === 'off') {
        btnArreterReprendre.innerHTML = "Arrêter";
        retraceCourbe();
        startUpdatingCircle();
        playDynamicChart();
        monitoringOnPlay();
    } else {
        stopRetraceCourbe();
        stopUpdatingCircle();
        btnArreterReprendre.innerHTML = "Reprendre";
        pauseDynamicChart();
        monitoringOnPause();
    }
}

function btnAnnulerCollecteAction() {
    navigator.notification.beep(1);
    navigator.notification.confirm(
            'Voulez-vous vraiment annuler la collecte ?', // message
            function (result) {
                if (result === 1)
                    annulerCollectes();
            }, // callback to invoke with index of button pressed
            '', // title
            ['Oui', 'Non']     // buttonLabels
            );
}

function btnExporterCollecteAction() {
//    alert('clicked');
    getData(createCSVAndSendByMail);
}

// this funcfunction  is for the periode call tratraceCourbe on graphics.js file
// every 30 second;
function retraceCourbe() {
    getValuesForCharts();
    processForCourbe = setInterval(getValuesForCharts, 30000);
}

//Stop of the repeat call tratraceCourben function
function stopRetraceCourbe() {
    clearInterval(processForCourbe);
}

// to get the values for the arrays and call the fucntion traceCourbe()
function getValuesForCharts() {
    var curentdateTime = getDate();
    var signalDbm = getSignalDbm();
    var batterieLevel = getBatterieLevel();
    var batterieEnChargeInt = isBatteriePluggedInteger();
    var hashkey = "" + curentdateTime + signalDbm + batterieLevel + batterieEnChargeInt;
    // add the battry level value
    tabBattry.push(batterieLevel);
    // -118 ----> -48 good it's mean the signal is perfect
    // add the signaldB value
    tabSignal.push(signalDbm);
    //Draw chart
    traceCourbe(tabBattry, tabSignal);
    //Update DB (insert value on DB)
//    doInsertOnDB(curentdateTime, signalDbm, batterieLevel, batterieEnChargeInt, hashkey);
}

function clearCourbes() {
    tabBattry = [];
    tabSignal = [];
    getValuesForCharts();
}

function setPanelUnderHeader() {
    var header = $('[data-role=header]').outerHeight();
    var panel = $('.ui-panel').height();
    var panelheight = panel - header;
    $('.ui-panel').css({
        'top': header,
        'min-height': panelheight
    });
}

function goPreviousPage() {
    navigator.app.backHistory();
}

function annulerCollectes() {
    //stop the caller function of printing circle
    goPreviousPage();
    stopRetraceCourbe();
    clearCourbes();
    stopUpdatingCircle();
    destroyDynamicChart();
    clearCircleDiv();
    clearSavedDataInDB();
    status = 'off';
    btnArreterReprendre.innerHTML = "Arrêter";
}

function onBackKeyDown() {
    if ($.mobile.activePage.attr('id') === 'idMonitoringPage') {
        btnAnnulerCollecteAction();
    } else {
        navigator.notification.beep(1);
        navigator.notification.confirm(
                "Voulez-vous vraiment quittez l'application ?", // message
                function (result) {
                    if (result === 1)
                        navigator.app.exitApp();
                }, // callback to invoke with index of button pressed
                '', // title
                ['Oui', 'Non']     // buttonLabels
                );
    }
}

//Set the opactity of monitoring div at 50% and show Pause text in the middle of screen when capture on pause
function monitoringOnPause() {
    $("#idMonitoringPageMain").css({opacity: 0.5});
    $("#pauseTxt").show();
    status = 'off';
    stopSavingDataInDB();
}

//Revert the opacity to 100% and hide pause text when capture is being done.
function monitoringOnPlay() {
    $("#idMonitoringPageMain").css({opacity: 1});
    $("#pauseTxt").hide();
    status = 'on';
    startSavingDataInDB();
}

function showAlert(message) {
    navigator.notification.beep(1);
    navigator.notification.alert(
            message,
            function () {

            }, // callback
            '', // title
            'Ok'// buttonName
            );
}