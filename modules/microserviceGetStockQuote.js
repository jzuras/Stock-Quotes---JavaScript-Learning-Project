// not sure about JS naming convention for this type of info...
const IS_MICROSERVICE_IMPLEMENTED = false;

/**
 * TODO - check with my microservice to see if a quote was entered for stock.
 * note - microservice is for demo purposes only, not actually useful.
 * @param {string} symbolToUse - ticker symbol for which to get data
 * @return {Promise<>}
 */
function microserviceGetStockQuote( symbolToUse )
{
    // todo
    return {
        companySymbol: symbolToUse,
        companyName: '[Name Here]',
        quote: 10.50,
        timeOfQuote : new Date().toLocaleString(),
    };
}

export { IS_MICROSERVICE_IMPLEMENTED, microserviceGetStockQuote };
