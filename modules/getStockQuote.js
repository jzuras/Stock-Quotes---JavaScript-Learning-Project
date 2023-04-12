import {IS_MICROSERVICE_IMPLEMENTED, microserviceGetStockQuote} from './microserviceGetStockQuote.js';

/*
export type StockData =
{
    companySymbol = '';
    companyName ='';
    currentQuote = 0;
    timeOfQuote = Date( now );

}
*/

let apikey = ''; // client needs to get this from user

const twelveDataURL =
    'https://api.twelvedata.com/quote?apikey=';

/**
 * This method uses JSON to fetch a quote using the apikey
 * for the sole purpose of validating the key. If valid, keeps a copy
 * for future use and returns true, otherwise returns false.
 * (To avoid putting sensitive info into public, user enters this key.)
 * @param {string} apikeyFromUser - need to get this from user input
 * @return {Promise<boolean>} - true if valid, false otherwise.
 */
export async function isApikeyValid( apikeyFromUser )
{
    try 
    {
        const apiString = twelveDataURL + encodeURI( apikeyFromUser ) +
            '&symbol=MSFT';
        
        const response = await fetch( apiString );

        if ( !response.ok ) 
        {
            return false;
        }

        const quote = await response.json();
        if ( quote.code )
        {
            // any presence of "code" in response means an error
            // for now, just assuming error is invalid apikey
            return false;
        }
    }    
    catch ( error )
    {
        return false;
    }
    
    // once here, apikey is valid, so save for future use
    apikey = apikeyFromUser;
    return true;
}

/** uses JSON to fetch the current quote from TwelveData, returning a Promise<StockData>, 
 * UNLESS my microservice is implemented and running, in which case it will try there first.
 * Note - microservice is for demo purposes, not actually useful for stock quotes.
 * Note - TwelveData limited to 800 free calls/month, avoid using timed refresh for this
 * @param {string} symbolToUse - ticker symbol for which to get data
 * @return {Promise<>}
 */
export async function getStockQuote( symbolToUse )
{
    if ( IS_MICROSERVICE_IMPLEMENTED )
    {
        // note - Microservice may not have info for the given company
        // so if not found there move on to normal quote
        const quoteData = microserviceGetStockQuote( symbolToUse );
        if ( quoteData.companyName ) return quoteData;
    }

    try 
    {
        // note - keeping this here for local testing, to save on API calls.
        //const apiString = './quoteFromTwelveDataMarketClosed.json' + '';
        const apiString = twelveDataURL + encodeURI( apikey ) +
            '&symbol=' + encodeURI( symbolToUse );
        
        const response = await fetch( apiString );

        if ( !response.ok ) 
        {
            throw new Error( `HTTP error: ${response.status}` );
        }
      
        const quote = await response.json();
        return mergeQuote( quote );
    }    
    catch ( error )
    {
        throw error;
    }
}
  
/**
 * Merge fetched quote information into StockData object, 
 * and add time of quote 
 * @param {*} quote - JSON object returned from TwelveData.
 * @returns 
 */
function mergeQuote( quote )
{
    // for now (until TypeScript), see StockData for structure of returned data

    // first check for error code and message
    // NOTE - for errors, JSON structure is different
    if ( quote.code )
    {
        throw new Error( quote.message );
    }
        
    const returnValue =
    {
        companySymbol: quote.symbol, // switch to quote.symbol to get all caps???
        companyName: quote.name,
    }

    if ( quote.extended_price ) // only present during extended hours
    {
        returnValue.quote = quote.extended_price;
        returnValue.timeOfQuote = new Date( quote.extended_timestamp * 1000 ).toLocaleString();
    }
    else
    {
        returnValue.quote = quote.close;
        returnValue.timeOfQuote = new Date( quote.timestamp * 1000 ).toLocaleString();
    }

    return returnValue;
}
