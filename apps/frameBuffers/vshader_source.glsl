attribute vec4 a_Position;
attribute vec4 a_TexCoord;
uniform mat4 u_MvpMatrix;
varying vec2 v_TexCoord;

void main(){
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord= a_TexCoord;
}
