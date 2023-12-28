

function GetIshkulBaseURL(){
    var apiUrl = process.env.ISHKUL_BACKEND_API_HOST;
    if (process.env.NODE_ENV === 'development') {
        apiUrl = "http://0.0.0.0:8080"
    } else if (process.env.NODE_ENV === 'production') {
        // Code that will run only in production environment
        apiUrl = "https://api.ishkul.org"
    } else {
        apiUrl = "https://api.ishkul.org"
    }
    return apiUrl;
}

export default GetIshkulBaseURL;