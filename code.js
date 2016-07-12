(function()
{
    var context = null;

    function initWebGL(canvas)
    {
        return new Promise(function(resolve, reject)
        {
            context = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

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

        // Set a handler to draw a new rectangle each time the canvas is clicked
        canvas.addEventListener("click", function(event)
        {
            vec2.set(pos, event.clientX - canvasRect.left, event.clientY - canvasRect.top);
        });

        var mat_1 = mat3.create();
        var mat_2 = mat3.create();
        
        var outMat = mat3.create();

        var update = function() {
            angle++;

            // Clear the canvas.
            context.clearColor(0, 0, 0, 1);
            context.clear(context.COLOR_BUFFER_BIT);
            
            var rad = 0.017 * angle;
            var cos = Math.cos(rad);
            var sin = Math.sin(rad);

            var scaleX = 2;
            var scaleY = 2;

            var originX = -50;
            var originY = -50;

            // Build local matrix from position, rotation, scale and origin
            // TODO: Try multiplying some of these matrices to test out nesting structures
            mat_1[0] = cos * scaleX;
            mat_1[1] = sin * scaleX;
            mat_1[2] = 0;
            mat_1[3] = -sin * scaleY;
            mat_1[4] = cos * scaleY;
            mat_1[5] = 0;
            mat_1[6] = originX * mat_1[0] + originY * mat_1[3] + 1 * pos[0];
            mat_1[7] = originX * mat_1[1] + originY * mat_1[4] + 1 * pos[1];
            mat_1[8] = 1;

            context.uniformMatrix3fv(matrixLocation, false, mat_1);
            context.uniform4f(colorLocation, 1, 0, 0, 1);

            // Draw the rectangle
            context.drawArrays(context.TRIANGLES, 0, 6);

            rad = 0.017 * angle;
            cos = Math.cos(rad);
            sin = Math.sin(rad);

            scaleX = 1;
            scaleY = 1;

            // Build local matrix from position, rotation, scale and origin
            // TODO: Try multiplying some of these matrices to test out nesting structures
            mat_2[0] = cos * scaleX;
            mat_2[1] = sin * scaleX;
            mat_2[2] = 0;
            mat_2[3] = -sin * scaleY;
            mat_2[4] = cos * scaleY;
            mat_2[5] = 0;
            mat_2[6] = originX * (mat_2[0]/scaleX) + originY * (mat_2[3]/scaleY) + 1 * 0;
            mat_2[7] = originX * (mat_2[1]/scaleX) + originY * (mat_2[4]/scaleY) + 1 * 0;
            mat_2[8] = 1;
            
            mat3.multiply(outMat, mat_1, mat_2);
            context.uniformMatrix3fv(matrixLocation, false, outMat);
            
            context.uniform4f(colorLocation, 0, 1, 0, 1);

            // Draw the rectangle
            context.drawArrays(context.TRIANGLES, 0, 6);

            requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    });

})();
