(function()
{
    var context = null;

    function initWebGL(canvas)
    {
        return new Promise(function(resolve, reject)
        {
            context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

            context.viewportWidth = canvas.width;
            context.viewportHeight = canvas.height;

            if (context)
            {
                resolve();
            }
            else
            {
                reject("Unable to initialize WebGL. Your browser may not support it.");
            }
        });
    }

    function initShaders()
    {
        return Promise.resolve().then(function()
        {
            return Promise.all([
                AJAX_UTILS.FetchText("shaders/vertexShader.vert"),
                AJAX_UTILS.FetchText("shaders/fragmentShader.frag"),
            ]);
        })
        .then(function(shaders)
        {
            return createProgram(
                compileShader(shaders[0], "vert"), 
                compileShader(shaders[1], "frag") 
            );
        });
    }

    function compileShader(programStr, type)
    {
        var shader = null;

        if (type === "vert")
            shader = context.createShader(context.VERTEX_SHADER);
        else
            shader = context.createShader(context.FRAGMENT_SHADER);

        context.shaderSource(shader, programStr);
        context.compileShader(shader);

        if (!context.getShaderParameter(shader, context.COMPILE_STATUS))
        {
            alert(context.getShaderInfoLog(shader));
            
            return;
        }

        return shader;
    }

    function createProgram(vertexShader, fragmentShader)
    {
        var program = context.createProgram();

        context.attachShader(program, vertexShader);
        context.attachShader(program, fragmentShader);

        context.linkProgram(program);

        var linked = context.getProgramParameter(program, context.LINK_STATUS);
        
        if (!linked) {
            console.error("Error in program linking: " + context.getProgramInfoLog(program));
            context.deleteProgram(program);
            
            return null;
        }

        return program;
    }

    var canvas = document.getElementById("glcanvas");

    initWebGL(canvas).then(function()
    {
        return initShaders();
    })
    .then(function(program)
    {
        context.useProgram(program);

        // look up where the vertex data needs to go.
        var positionLocation = context.getAttribLocation(program, "a_position");

        // lookup uniforms
        var resolutionLocation = context.getUniformLocation(program, "u_resolution");
        var offsetLocation = context.getUniformLocation(program, "u_offset");
        var colorLocation = context.getUniformLocation(program, "u_color");

        // set the resolution
        context.uniform2f(resolutionLocation, canvas.width, canvas.height);
        
        // Create a buffer.
        var buffer = context.createBuffer();
        context.bindBuffer(context.ARRAY_BUFFER, buffer);
        context.enableVertexAttribArray(positionLocation);
        context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);

        // Fill the buffer with the values that define a rectangle.
        var left = 0;
        var top = 0;
        var right = left + 100;
        var bottom = top + 100;

        context.bufferData(
            context.ARRAY_BUFFER,
            new Float32Array([
                left, top,
                right, top,
                right, bottom,
                left, top,
                right, bottom,
                left, bottom
            ]),
            context.STATIC_DRAW
        );

        // Draw the scene

        // Clear the canvas.
        context.clearColor(0, 0, 0, 1);
        context.clear(context.COLOR_BUFFER_BIT);

        var canvasRect = canvas.getBoundingClientRect();

        // Set a handler to draw a new rectangle each time the canvas is clicked
        canvas.addEventListener("click", function(event)
        {
            // Clear the canvas.
            context.clearColor(0, 0, 0, 1);
            context.clear(context.COLOR_BUFFER_BIT);

            // Set the position of each rectangle by adjusting the offset uniform
            context.uniform2f(offsetLocation, event.clientX - canvasRect.left, event.clientY - canvasRect.top);

            // Set a color by adjusting the color uniform
            context.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);

            // Draw the rectangle
            context.drawArrays(context.TRIANGLES, 0, 6);
        });
    });

})();

