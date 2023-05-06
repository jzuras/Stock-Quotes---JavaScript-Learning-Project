
/*
export type TimeSeriesStockData =
[
    { X: 2023-04-05 09:30:00, Y: 22 },
    { X: 2023-04-05 09:35:00, Y: 28 }, // etc...
]
*/


let apikey = ''; // client needs to get this from user

async function getTimeSeriesForDate( symbolToUse, dateToUse )
{
    try 
    {
        // note - keeping this here for local testing, to reduce # of API calls.
        //const apiString = './quoteTimeSeries.json';
        
        // get date in format: 1970-01-01T00:00:00.000Z
        let dateInISOFormat = dateToUse.toISOString();
        let dateOnly = dateInISOFormat.slice(0, 10);

        const apiString =
            'https://api.twelvedata.com/time_series?interval=5min&order=ASC' +
            '&date=' + dateOnly + '&apikey=' + encodeURI( apikey ) +
            '&symbol=' + encodeURI( symbolToUse );
        
        const response = await fetch( apiString );

        if ( !response.ok ) 
        {
            throw new Error( `HTTP error: ${response.status}` );
        }
      
        const timeSeriesData = await response.json();

        return timeSeriesData;
    }    
    catch ( error )
    {
        throw error;
    }
}

/**
 * To avoid putting sensitive info into public, get this from user.
 * NOTE - assumption is that this key has been validated elsewhere.
 * @param {string} apikeyFromUser - need to get this from user input
 */
 export function setApikey( apikeyFromUser )
 {
     apikey = apikeyFromUser;
 }
 

/** 
 * uses JSON to fetch the data from TwelveData, returning a Promise<StockData>, 
 * Note - TwelveData limited to 800 free API calls/month
 * @param {string} symbolToUse - ticker symbol for which to get data
 * @return {Promise<>}
 */
export async function getTimeSeries( symbolToUse )
{
    try 
    {
        let timeSeriesData;

        // timeSeriesData may fail when market did not open for the day (weekend)
        // or has not yet opened (pre-market)
        // in these cases, attempt to get yesterday's data
        // if still an issue, keep going back one day, but try a max of 4 times
        // (if the market was closed for more than 4 days, throw error)
        let maxTries = 1;
        let success = false;
        const dateToTry = new Date(); // today
        while ( maxTries < 5 && !success )
        {
            timeSeriesData =
                await getTimeSeriesForDate( symbolToUse, dateToTry );
            if ( timeSeriesData.hasOwnProperty( 'code' ) &&
                timeSeriesData.code === 400 )
            {
                // keep trying - may remove this part
                dateToTry.setDate( dateToTry.getDate() - 1 );
                maxTries++;
            }
            else
            {
                success = true;
            }
        }
        return mergeQuote( timeSeriesData );
    }
    catch ( error )
    {
        throw error;
    }

}
  

/**
 * Merge fetched quote information into TimeSeriesStockData object.
 * 
 * @param {*} timeSeriesData - JSON object returned from TwelveData.
 * @returns { [ {X,Y} ] } - an array of objects with X and Y fields.
 */
function mergeQuote( timeSeriesData )
{
    // for now (until TypeScript), see TimeSeriesStockData for structure of returned data

    // first check for error code and message
    // NOTE - for errors, JSON structure is different
    if ( timeSeriesData.code )
    {
        throw new Error( timeSeriesData.message );
    }
    
    // todo - any quote structure changes for market open or closed???
    const returnValue = new Array();

    // loop through data and populate returnValue
    for ( let i = 0; i < timeSeriesData.values.length; i++ ) 
    {
        returnValue[i] =
        {
            X: timeSeriesData.values[i].datetime,
            Y: Number(timeSeriesData.values[i].close)
        }
    }

    return returnValue;
}