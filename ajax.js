if (!window.AJAX_UTILS)
    window.AJAX_UTILS = {};

(function()
{
    window.AJAX_UTILS.FetchText = function fetchText(url)
    {
        return new Promise(function(resolve, reject)
        {
            var xhr = new XMLHttpRequest();
            
            xhr.addEventListener("load", function()
            {
                resolve(xhr.responseText);
            });
            xhr.open("GET", url);
            xhr.send();
        });
    }

})();