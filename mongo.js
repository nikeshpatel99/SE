/** IMPORTANT **/
/*
 * If creating an insertion for a booking for the functions below, for collectionName
 * use 'Bookings' and for a lock use 'Locks'. Failure to comply will result in the db
 * being polluted with a bunch of random collections which is bad juju.
 */
function deleteEntry(bookingID,modelName){
    keystone.list(modelName).model.deleteOne({bookingID: bookingID},function(err){
        if(err){
            console.log("Problem deleting..");
            console.log(err);
        }
    });
    return 0;
}

//gets the facility name given facility id
function getFacilityName(facilityID,callback){
    keystone.list("Facility").model.findOne({_id:facilityID},function(err,res){
        callback(res.title);
    });
}


//callback with (error,lock), error if there is no such lock - ie a booking has timed out
function getLock(bookingId, callback) {
    keystone.list("Locks").model.findOne({bookingID: bookingId},function(err,res){
        if(err){
            console.log(err);
            callback(err);
            return 0;
        }
        if(res){
            callback(false,res); //return the lock
        }
        else{
            callback('Timed out'); //in this case, the lock has timed out
        }
    });
}

// adds an entry to either locks or bookings
function addEntry(modelName, bookingId,startTime,endTime,facilityId,price,name,email,information,callback){
    //
    let ev = {
        bookingID: bookingId,
        startTime: startTime,
        endTime: endTime,
        facility: facilityId,
        price: price,
        email: email,
        information: information,
        customerName: name
    }
    if (modelName === "Locks"){
        ev.timestamp = Date.now();
    }
    keystone.list(modelName).model.create(ev,function(err,ev){
        if(err){
            callback(err);
            return 0;
        }
        console.log('successfully added to db')
        callback(false);
    });
    return 0;
}


//lists the entries which clash with each other
//returns 'error' if error
function listEntries(modelName,startTime,endTime,facilityId,callback){
    //returns cursor of bookings that lie between the two times
    keystone.list(modelName).model.find({
        facility: {$eq: facilityId},
        //Hopefully robust clash checking:
        // if existing booking overlaps into the start of our booking
        $or:[{endTime: {$gt: startTime, $lte: endTime}},
            // if existing booking overlaps into the end of our booking
            {startTime: {$lt: endTime, $gte:startTime}},
            // if existing booking contains our whole duration of our booking
            {startTime: {$lte:startTime},endTime:{$gte:endTime}}
        ]
    },function(err,res){
        if(err){
            callback('error');
            return 0;
        }
        callback(false,res);
    });
    return 0;
}

//TODO, complete this
function checkAvailability(startTime,endTime,facilityId,callback){
    keystone.list("Facility").model.find({
        _id: {$eq: facilityId}
    }),function(err,res){
        if(err){
            callback('error');
            return 0;
        }

    }
}

//validates automated booking
//callbacks with error message or false
function bookingValAut(startTime,endTime,facilityId,callback){
    if(startTime >= endTime){
        callback('End of slot must be later than start');
        return 0;
    }
    checkBusy(startTime,endTime,facilityId,'','',function(err,res){
        if(err){
            callback('An unexpected error occured');
            return 0;
        }
        if(res == 'busy'){
            callback('Slot is busy at that time');
        }
        else{
            callback(false);
        }
    });
}


//validates manual booking
//callbacks with error message or false
function bookingValMan(startTime,endTime,facilityId,unique_id,bookingID,callback){
    if(startTime >= endTime){
        callback('End of slot must be later than start');
        return 0;
    }
    checkBusy(startTime,endTime,facilityId,unique_id,bookingID,function(err,res){
        if(err){
            callback('An unexpected error occured');
            return 0;
        }
        if(res == 'busy'){
            callback('Slot is busy at that time');
        }
        else{
            callback(false);
        }
    });

}
//callbacks with err,busyString where busyString is either 'busy' or 'notBusy'
function checkBusy(startTime,endTime,facilityId,unique_id,bookingID,callback){
    let current = Date.now();
    listEntries("Locks",startTime,endTime,facilityId,function(err,locks){
        if(err){
            callback('error');
            return 0;
        }
        let i = 0;
        for (i= 0; i<locks.length;i++){
            let diff = current - locks[i].timestamp;
            if (diff < (1000 * 60 * 5)){ // if lock is recent
                //if lock not from our own booking
                if (locks[i].bookingID.toString() != bookingID.toString()){
                    console.log('booked out');
                    callback(false,'busy');
                    return 0;
                }

            }
        }
        listEntries("Bookings",startTime,endTime,facilityId,function(err,bookings){
            if(err){
                callback('error');
                return 0;
            }
            let i = 0;
            for (i= 0; i<bookings.length;i++){
                //to handle keystone checking hook twice
                if (bookings[i]._id.toString() != unique_id.toString()){
                    console.log('booked out');
                    callback(false,'busy');
                    return 0;
                }
            }
            callback(false,'notBusy');
        });
    });
}


//callbacks with err,bookingList where bookingList is a list of clashing bookings in format:
//{title:"unavailable",startTime:ISOString, endTime:ISOString}

function unavailable(startTime,endTime,facilityId,callback){
    let current = Date.now();
    let bookingList = [];
    listEntries("Locks",startTime,endTime,facilityId,function(err,locks){
        if(err){
            callback('error');
            return 0;
        }
        let i = 0;
        for (i= 0; i<locks.length;i++){
            let diff = current - locks[i].timestamp;
            if (diff < (1000 * 60 * 5)){ // if lock is recent
                console.log('locked');
                let st = locks[i].startTime.toISOString();
                let et = locks[i].endTime.toISOString();
                bookingList.push({title:"unavailable",start:st,end:et})
            }
        }
        listEntries("Bookings",startTime,endTime,facilityId,function(err,bookings){
            if(err){
                callback('error');
                return 0;
            }
            console.log(bookings.length);
            for (i= 0; i<bookings.length;i++){
                let st = bookings[i].startTime.toISOString();
                let et = bookings[i].endTime.toISOString();
                bookingList.push({title:"unavailable",start:st,end:et});
            }
            console.log(bookingList);
            callback(false,bookingList);
        });
    });
}

function calcPrice(facilityId, startTime, endTime, callback) {
    keystone.list("Facility Prices").model.find().where("facility", facilityId).exec(function (err, pricingData) {
        console.log("PRICES", pricingData);
        if (err) {
            callback('Pricing for this facility not found/does not exist');
            return 0;
        }
        else {
            startTime = startTime.split(":");
            endTime = endTime.split(":");
            let noHours = parseInt(endTime[0], 10) - parseInt(startTime[0], 10);
            let noMins = parseInt(endTime[1], 10) - parseInt(startTime[1], 10);
            if (noMins < 0) {
                noHours--;
                noMins = Math.abs(noMins);
            }
            let totHours = noHours + (noMins / 60);

            let price = 0;

            let price1 = 0;
            let price3 = 0;
            let price7 = 0;

            for (let i = 0; i < pricingData.length; i++) {
                if (pricingData[i].lengthInHours == 1) {
                    price1 = pricingData[i].priceInGBP;
                }
                else if (pricingData[i].lengthInHours == 3) {
                    price3 = pricingData[i].priceInGBP;
                }
                else if (pricingData[i].lengthInHours == 7) {
                    price7 = pricingData[i].priceInGBP;
                }
            }

            while (totHours != 0) {
                if (totHours >= 7) {
                    price += price7;
                    totHours -= 7;
                }
                else if (totHours < 7 && totHours >= 3) {
                    price += price3;
                    totHours -= 3;
                }
                else if (totHours < 3) {
                    price += price1;
                    totHours -= 1;
                }
            }

            callback(false, price);
        }
    });
}



module.exports.getFacilityName = getFacilityName;
module.exports.getLock = getLock;
module.exports.unavailable = unavailable;
module.exports.addEntry = addEntry;
module.exports.bookingValMan = bookingValMan;
module.exports.bookingValAut = bookingValAut;
module.exports.deleteEntry = deleteEntry;
module.exports.calcPrice = calcPrice;
