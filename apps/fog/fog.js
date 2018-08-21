/**
 * 如何实现雾化
 * 实现雾化有很多种方式，这里使用最简单的一种，`线性雾化`。
 * 在线性雾化中，某一点的雾化程度取决于它与视点之间的距离，距离越远，雾化程度越高。
 * 线性雾化有起点和终点，起点表示开始雾化之处，终点表示完全雾化之处，两点之间某一点的雾化程度与该点与视点之间的距离呈线性关系。
 * 某一点的雾化程度可以被定义为`雾化因子`。
 * <雾化因子> = ( <终点> - <当前点与视点间的距离> ) / ( <终点> - <起点> )
 * 在片元着色器中根据雾化因子计算片元的公式为:
 * <片元颜色> = <物体表面颜色> * <雾化因子> + <雾的颜色> * ( 1 - <雾化因子> ) 
 */


import { Matrix4, Vector4 } from '../../utils/gl-matrix';

const VSHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_ModelMatrix;
    uniform vec4 u_Eye;  // 视点坐标
    varying vec4 v_Color;
    varying float v_Dist;
    void main(){
        gl_Position = u_MvpMatrix * a_Position;
        v_Color = a_Color;
        //计算顶点与视点的距离
        v_Dist = distance(u_ModelMatrix * a_Position ,u_Eye );
    }
`;

const FSHADER_SOURCE = `
    precision mediump float;
    uniform vec3 u_FogColor; // 雾的颜色
    uniform vec2 u_FogDist;  //雾化的起点和终点
    varying vec4 v_Color;
    varying float v_Dist;
    void main(){
        // 计算雾化因子
        float fogFactor = clamp((u_FogDist.y - v_Dist )/(u_FogDist.y - u_FogDist.x ),0.0,1.0);
        vec3 color = mix(u_FogColor,vec3(v_Color),fogFactor);
        gl_FragColor = vec4(color,v_Color.a);
    }
`;

function main() {
    const canvas = document.getElementById('webgl');
    /**
     * @type { WebGLRenderingContext }
     */
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('获取webgl对象报错');
        return;
    }

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vertexShader, VSHADER_SOURCE);
    gl.shaderSource(fragmentShader, FSHADER_SOURCE);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.program = program;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.useProgram(program);

    const n = initVertexBuffers(gl);
    if (n < 0) {
        console.log('Failed to create the vertex buffer');
        return;
    }
    //雾的颜色
    const fogColor = new Float32Array([0.137, 0.231, 0.432]);
    //雾化的起点和终点与视点间的距离
    const fogDist = new Float32Array([55, 80]);

    const eye = new Float32Array([25, 65, 35,1.0]);

    const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    const u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    const u_FogDist = gl.getUniformLocation(gl.program, 'u_FogDist');
    const u_FogColor = gl.getUniformLocation(gl.program, 'u_FogColor');
    const u_Eye = gl.getUniformLocation(gl.program, 'u_Eye');
    if (!u_MvpMatrix || !u_ModelMatrix || !u_FogDist || !u_FogColor || !u_Eye) {
        console.log('Failed to get the uniform location. ');
        return;
    }

    gl.uniform3fv(u_FogColor, fogColor);
    gl.uniform2fv(u_FogDist, fogDist);
    gl.uniform4fv(u_Eye, eye);

    gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
    gl.enable(gl.DEPTH_TEST);

    const modelMatrix = new Matrix4();
    modelMatrix.setScale(10, 10, 10);
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    const mvpMatrix = new Matrix4();
    mvpMatrix.perspective(30, canvas.width / canvas.clientHeight, 1.0, 1000.0);
    mvpMatrix.lookAt(eye[0], eye[1], eye[2], 0, 2, 0, 0, 1, 0);
    mvpMatrix.multiply(modelMatrix);
    gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix.elements);

    document.onkeydown = function (evt) {
        keydown(evt, gl, n, u_FogDist, fogDist);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    const modelViewMatrix = new Matrix4();
    modelViewMatrix.setLookAt(eye[0], eye[1], eye[2], 0, 2, 0, 0, 1, 0);
    modelViewMatrix.multiply(modelMatrix);
    modelViewMatrix.multiplyVector4(new Vector4([1, 1, 1, 1]));
    mvpMatrix.multiplyVector4(new Vector4([1, 1, 1, 1]));
    modelViewMatrix.multiplyVector4(new Vector4([-1, 1, 1, 1]));
    mvpMatrix.multiplyVector4(new Vector4([-1, 1, 1, 1]));
}

function keydown(evt, gl, n, u_FogDist, fogDist) {
    switch (evt.keyCode) {
        case 38: // Up arrow key -> Increase the maximum distance of fog
            fogDist[1] += 1;
            break;
        case 40: // Down arrow key -> Decrease the maximum distance of fog
            if (fogDist[1] > fogDist[0]) fogDist[1] -= 1;
            break;
        default: return;
    }
    gl.uniform2fv(u_FogDist, fogDist);   // Pass the distance of fog
    // Clear color and depth buffer
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Draw
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}

function initVertexBuffers(gl) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3

    var vertices = new Float32Array([   // Vertex coordinates
        1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1,    // v0-v1-v2-v3 front
        1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1,    // v0-v3-v4-v5 right
        1, 1, 1, 1, 1, -1, -1, 1, -1, -1, 1, 1,    // v0-v5-v6-v1 up
        -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1,    // v1-v6-v7-v2 left
        -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1,    // v7-v4-v3-v2 down
        1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, -1     // v4-v7-v6-v5 back
    ]);

    var colors = new Float32Array([     // Colors
        0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0,  // v0-v1-v2-v3 front
        0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4,  // v0-v3-v4-v5 right
        1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4, 1.0, 0.4, 0.4,  // v0-v5-v6-v1 up
        1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4,  // v1-v6-v7-v2 left
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,  // v7-v4-v3-v2 down
        0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0, 0.4, 1.0, 1.0   // v4-v7-v6-v5 back
    ]);

    var indices = new Uint8Array([       // Indices of the vertices
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    // Create a buffer object
    var indexBuffer = gl.createBuffer();
    if (!indexBuffer)
        return -1;

    // Write the vertex property to buffers (coordinates and normals)
    if (!initArrayBuffer(gl, vertices, 3, gl.FLOAT, 'a_Position')) return -1;
    if (!initArrayBuffer(gl, colors, 3, gl.FLOAT, 'a_Color')) return -1;

    // Write the indices to the buffer object
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

function initArrayBuffer(gl, data, num, type, attribute) {
    // Create a buffer object
    var buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    var a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    // Enable the assignment of the buffer object to the attribute variable
    gl.enableVertexAttribArray(a_attribute);
    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return true;
}


export default main;