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

        var mat = mat3.create();
        var outMat = mat3.create();
        var pos = vec2.create();

        // look up where the vertex data needs to go.
        var positionLocation = context.getAttribLocation(program, "a_position");

        // lookup uniforms
        var resolutionLocation = context.getUniformLocation(program, "u_resolution");
        var colorLocation = context.getUniformLocation(program, "u_color");
        var matrixLocation = context.getUniformLocation(program, "u_matrix");

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
        var angle = 0;
        var scale = [2, 1];
        var origin = [-50, -50];

        // Set a handler to draw a new rectangle each time the canvas is clicked
        canvas.addEventListener("click", function(event)
        {
            vec2.set(pos, event.clientX - canvasRect.left, event.clientY - canvasRect.top);

            // Set a color by adjusting the color uniform
            context.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);
        });

        var update = function() {
            angle++;

            // Clear the canvas.
            context.clearColor(0, 0, 0, 1);
            context.clear(context.COLOR_BUFFER_BIT);

            // TODO: Reemplazar todo esto por una sola llamada a un metodo fromTransform
            // x, y, rotation, scaleX, scaleY, originX, originY

            mat3.identity(mat);
            mat3.identity(outMat);

            mat3.translate(outMat, mat, pos);
            mat3.rotate(mat, outMat, 0.017 * angle);
            mat3.scale(outMat, mat, scale);
            mat3.translate(mat, outMat, origin);
            
            context.uniformMatrix3fv(matrixLocation, false, mat);

            // Draw the rectangle
            context.drawArrays(context.TRIANGLES, 0, 6);

            requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    });

})();

