const axios = require('axios').default;
const winstonLogger = require('../../config/logger');

var universityModel = require('../../models/universityModel');

async function reloadUniversityCrime(uid){
    try {
        await universityModel.deleteUniversityCrime(uid);
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

async function getUniversityBasicInfo2(uid, loadYear, loadMonth){
    try {
        var university = await universityModel.getUniversityBasicInfo2(uid);
        return university;
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

async function getUniversities(){
    try {
        var universities = await universityModel.getUniversities();
        return universities;
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

async function downloadUniversityCrimeYearMonth(uid, loadYear, loadMonth){
    winstonLogger.info('downloadUniversityCrimeYearMonth: ' + uid + " / " + loadYear + "-" + loadMonth, 
    { metadata: { 'process' : 'service - downloadUniversityCrimeYearMonth', 'uid': uid, 'yyyy-mm': loadYear + "-" + loadMonth } })
    try {
        var university = await universityModel.getUniversityBasicInfo2(uid);
        //console.log("downloadUniversityCrimeYearMonth - JSON.stringify(university): " + JSON.stringify(university));
        university = university[0];
        //console.log("uniService - downloadUniversityCrimeYearMonth - university: " + JSON.stringify(university));
        console.log("uniService - downloadUniversityCrimeYearMonth - loadYear-loadMonth: " + loadYear + "-" + loadMonth);
        
        // download police data
        // if download success, delete (pull) the year-month record, then insert (push)
        let path = 'https://data.police.uk/api/crimes-street/all-crime?lat=' +  university.latitude +
        '&lng=' + university.longitude + '&date=' + loadYear + '-' + loadMonth;
        //console.log("uniService - downloadUniversityCrime2 - path: " + path);
        await axios.get(path).then(async function (response){
            await universityModel.deleteUniversityYearMonthCrime(uid,loadYear,loadMonth);
            await universityModel.insertUniversityYearMonthCrime(uid,loadYear,loadMonth, response.data);
        }); 

        var return_value = [];
        return_value.push({'_id':university._id});
        return_value.push({'university_name':university.university_name});
        return_value.push({'year_month':loadYear + "-" + loadMonth});
        //return_value.push({'crime count':result_crime_count});
        return return_value;
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

async function downloadUniversityCrime(uid){
    try {

        var today = new Date();
        console.log("downloadUniversityCrime - today:" + today);
        var mm = today.getMonth()+1; 
        if(mm<10) {mm=`0${mm}`}; 
        var yyyy = new Date().getFullYear();

        console.log("downloadUniversityCrime: " + uid + " / " + yyyy + "-" + mm);

        var number_month_download = 7; 

        for (let index = 0; index < number_month_download; index++){
            //winstonLogger.info('msg', { metadata: { 'process' : 'service - downloadUniversityCrime', 'yyyy-mm': yyyy + "-" + mm } })
            //winstonLogger.info('msg', { metadata: { 'process' : 'ucrime_get', 'processing_time': 123 } });
            
            try {
                await this.downloadUniversityCrimeYearMonth(uid, yyyy, mm)
            } catch (e) {
                console.error(e);
            }
            
            mm = mm - 1;
            if (mm == 0) {
              mm = 12;
              yyyy = yyyy -1;
            } 
            if(mm<10) {mm=`0${mm}`}; 
        }
        return "downloadUniversityCrime - end of function";
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

async function reloadAlUniCrimeData(){
    try {
        var universities = await universityModel.getUniversities();

        //universities.forEach (async (university) => {
        for (let i = 0; i < universities.length; i++) {
            console.log("reloadAlUniCrimeData: " + universities[i]._id + " - " + universities[i].university_name );
            await universityModel.deleteUniversityCrime(universities[i]._id);
            
            await this.downloadUniversityCrime(universities[i])
/*             var today = new Date();
            var mm = today.getMonth()+1; 
            if(mm<10) {mm=`0${mm}`}; 
            var yyyy = new Date().getFullYear();

            var number_month_download = 7; 

            for (let index = 0; index < number_month_download; index++){
                console.log("reloadAlUniCrimeData: " + universities[i]._id + " / " + yyyy + "-" + mm)
                try {
                    await this.downloadUniversityCrimeYearMonth(universities[i]._id, yyyy, mm)
                } catch (e) {
                    console.error(e);
                }
                
                mm = mm - 1;
                if (mm == 0) {
                  mm = 12;
                  yyyy = yyyy -1;
                } 
                if(mm<10) {mm=`0${mm}`}; 
            } */
        }
    } catch (e) {
        console.error(e);
    } finally {
        
    }
}

module.exports = {
    reloadUniversityCrime,
    downloadUniversityCrime,
    downloadUniversityCrimeYearMonth,
    getUniversityBasicInfo2,
    reloadAlUniCrimeData,
    getUniversities

}