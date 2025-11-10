import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enabled = true;
controls.minDistance = 10;
controls.maxDistance = 50;

function translationMatrix(tx, ty, tz) {
	return new THREE.Matrix4().set(
		1, 0, 0, tx,
		0, 1, 0, ty,
		0, 0, 1, tz,
		0, 0, 0, 1
	);
}

function rotationMatrixX(theta) {
    return new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, Math.cos(theta), -Math.sin(theta), 0,
        0, Math.sin(theta), Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixY(theta) {
    return new THREE.Matrix4().set(
        Math.cos(theta), 0, Math.sin(theta), 0,
        0, 1, 0, 0,
        -Math.sin(theta), 0, Math.cos(theta), 0,
        0, 0, 0, 1
    );
}

function rotationMatrixZ(theta) {
	return new THREE.Matrix4().set(
		Math.cos(theta), -Math.sin(theta), 0, 0,
		Math.sin(theta),  Math.cos(theta), 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1
	);
}

let planets = []; 
let clock = new THREE.Clock();
let attachedObject = null;
let blendingFactor = 0.1;

// Create additional variables as needed here
const defaultCamPos = new THREE.Vector3(0, 10, 20);  

// TODO: Create the sun
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 }), 
);

// TODO: Create sun light
let sunLight = new THREE.PointLight(0xffffff, 1, 0, 1); // White light
sunLight.position.set(0, 0, 0);

// Create orbiting planets
// TODO: Create Planet 1: Flat-shaded Light Gray Planet
const p1Geom = new THREE.SphereGeometry(1, 10, 8);
const p1Mat  = new THREE.MeshPhongMaterial({
    color: 0x909090,
    flatShading: true,     
    shininess: 30,         
    specular: 0x111111
});

const planet1 = new THREE.Mesh(p1Geom, p1Mat);

// TODO: Create Planet 2: Turquoise with Dynamic Shading
const p2Geom = new THREE.SphereGeometry(1, 12, 10);
const p2Params = {
    color: new THREE.Color(0x66FFF2),
    ambient: 0.0,
    diffusivity: 0.5,
    specularity: 1.0,
    smoothness: 40.0
};
const p2PhongMat   = createPhongMaterial(p2Params);
const p2GouraudMat = createGouraudMaterial(p2Params);
const planet2 = new THREE.Mesh(p2Geom, p2PhongMat);

// TODO: Create Planet 3: Copper Planet with Ring
const p3Params = {
    color: new THREE.Color(0xC97A33), 
    ambient: 0.0,
    diffusivity: 1.0,
    specularity: 1.0,
    smoothness: 100.0
 };
const p3Geom = new THREE.SphereGeometry(1, 16, 16);
const planet3 = new THREE.Mesh(p3Geom, createPhongMaterial(p3Params));

// Planet 3 Ring
const ringGeom = new THREE.RingGeometry(1.5, 2.5, 64);
const ringMat  = createRingMaterial({ color: new THREE.Color(0xC79B6D) });
const ring = new THREE.Mesh(ringGeom, ringMat);
ring.rotation.set(THREE.MathUtils.degToRad(60), 0, THREE.MathUtils.degToRad(35));
planet3.add(ring);

// TODO: Create Planet 4: Soft Light Blue Planet
const p4Geom = new THREE.SphereGeometry(1, 20, 18);
const p4Params = {
    color: new THREE.Color(0x2A7FFF),
    ambient: 0.0,
    diffusivity: 1.0,
    specularity: 1.0,
    smoothness: 100.0
};
let planet4 = new THREE.Mesh(p4Geom, createPhongMaterial(p4Params));

// TODO: Create Planet 4's Moon
const p4MoonGeom = new THREE.SphereGeometry(1, 4, 2);
const p4MoonMat  = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0xC83CB9),
    flatShading: true
});
let p4Moon = new THREE.Mesh(p4MoonGeom, p4MoonMat);
planet4.add(p4Moon);

// Add all the planets
scene.add(planet1, planet2, planet3, planet4, sun, sunLight);

// TODO: Store planets and moon in an array for easy access, 
// e.g. { mesh: planet1, distance: 5, speed: 1.1 },
planets = [
  { mesh: planet1, name: "planet1", distance: 7, speed: 1.1},
  { mesh: planet2, name: "planet2", distance: 10, speed: 5/8},
  { mesh: planet3, name: "planet3", distance: 13, speed: 5/11},
  { mesh: planet4, name: "planet4", distance: 16, speed: 5/14}
];

// Handle window resize
window.addEventListener('resize', onWindowResize, false);

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

animate();

// TODO: Implement the Gouraud Shader for Planet 2
function createGouraudMaterial(materialProperties) {   
    const numLights = 1;
    let shape_color_representation = new THREE.Color(materialProperties.color);

    let shape_color = new THREE.Vector4(
        shape_color_representation.r,
        shape_color_representation.g,
        shape_color_representation.b,
        1.0
    ); 

    // TODO: Implement the Vertex Shader in GLSL
    let vertexShader = `
    precision mediump float;
    const int N_LIGHTS = ${numLights};

    uniform float ambient, diffusivity, specularity, smoothness;
    uniform vec4  light_positions_or_vectors[N_LIGHTS];
    uniform vec4  light_colors[N_LIGHTS];
    uniform float light_attenuation_factors[N_LIGHTS];
    uniform vec4  shape_color;
    uniform vec3  squared_scale;
    uniform vec3  camera_center;

    uniform mat4 model_transform;
    uniform mat4 projection_camera_model_transform;

    // Gouraud: pass lit color to the fragment shader
    varying vec4 vColor;

    void main() {
        // World-space position & normal
        vec3 N = normalize(mat3(model_transform) * normal / squared_scale);
        vec3 worldPos = (model_transform * vec4(position, 1.0)).xyz;
        vec3 E = normalize(camera_center - worldPos);

        // Start with ambient
        vec3 accum = shape_color.rgb * ambient;

        // Light loop (mirror your Phong uniform semantics)
        for (int i = 0; i < N_LIGHTS; ++i) {
        vec3 Lvec = light_positions_or_vectors[i].xyz
                    - light_positions_or_vectors[i].w * worldPos;
        float dist = length(Lvec);
        vec3 L = (dist > 0.0) ? (Lvec / dist) : vec3(0.0);

        // Use reflection vector like your Phong ref
        vec3 R = reflect(-L, N);

        float diff = max(dot(N, L), 0.0);
        float spec = (diff > 0.0) ? pow(max(dot(R, E), 0.0), smoothness) : 0.0;

        float att = 1.0 / (1.0 + light_attenuation_factors[i] * dist * dist);

        vec3 contrib =
            shape_color.rgb * light_colors[i].rgb * diffusivity * diff +
            light_colors[i].rgb * specularity * spec;

        accum += att * contrib;
        }

        vColor = vec4(accum, shape_color.a);

        // Final clip-space position
        gl_Position = projection_camera_model_transform * vec4(position, 1.0);
    }
    `;

    // TODO: Implement the Fragment Shader in GLSL
    let fragmentShader = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
        gl_FragColor = vColor;
    }
    `;    

    // Uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // Create the ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// Custom Phong Shader has already been implemented, no need to make change.
function createPhongMaterial(materialProperties) {
    const numLights = 1;
    
    // Convert shape_color1 to a Vector4
    let shape_color_representation = new THREE.Color(materialProperties.color);
    let shape_color = new THREE.Vector4(
        shape_color_representation.r,
        shape_color_representation.g,
        shape_color_representation.b,
        1.0
    );

    // Vertex Shader
    let vertexShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace); // View direction
            vec3 result = vec3(0.0); // Initialize the output color
            for(int i = 0; i < N_LIGHTS; i++) {
                // Calculate the vector from the surface to the light source
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector); // Light distance
                vec3 L = normalize(surface_to_light_vector); // Light direction
                
                // Phong uses the reflection vector R
                vec3 R = reflect(-L, N); // Reflect L around the normal N
                
                float diffuse = max(dot(N, L), 0.0); // Diffuse term
                float specular = pow(max(dot(R, E), 0.0), smoothness); // Specular term
                
                // Light attenuation
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                // Calculate the contribution of this light source
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main() {
            gl_Position = projection_camera_model_transform * vec4(position, 1.0);
            N = normalize(mat3(model_transform) * normal / squared_scale);
            vertex_worldspace = (model_transform * vec4(position, 1.0)).xyz;
        }
    `;
    // Fragment Shader
    let fragmentShader = `
        precision mediump float;
        const int N_LIGHTS = ${numLights};
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS];
        uniform vec4 light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 camera_center;
        varying vec3 N, vertex_worldspace;

        // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights(vec3 N, vec3 vertex_worldspace) {
            vec3 E = normalize(camera_center - vertex_worldspace); // View direction
            vec3 result = vec3(0.0); // Initialize the output color
            for(int i = 0; i < N_LIGHTS; i++) {
                // Calculate the vector from the surface to the light source
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                    light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length(surface_to_light_vector); // Light distance
                vec3 L = normalize(surface_to_light_vector); // Light direction
                
                // Phong uses the reflection vector R
                vec3 R = reflect(-L, N); // Reflect L around the normal N
                
                float diffuse = max(dot(N, L), 0.0); // Diffuse term
                float specular = pow(max(dot(R, E), 0.0), smoothness); // Specular term
                
                // Light attenuation
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light);
                
                // Calculate the contribution of this light source
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                        + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        }

        void main() {
            // Compute an initial (ambient) color:
            vec4 color = vec4(shape_color.xyz * ambient, shape_color.w);
            // Compute the final color with contributions from lights:
            color.xyz += phong_model_lights(normalize(N), vertex_worldspace);
            gl_FragColor = color;
        }
    `;

    // Prepare uniforms
    const uniforms = {
        ambient: { value: materialProperties.ambient },
        diffusivity: { value: materialProperties.diffusivity },
        specularity: { value: materialProperties.specularity },
        smoothness: { value: materialProperties.smoothness },
        shape_color: { value: shape_color },
        squared_scale: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        camera_center: { value: new THREE.Vector3() },
        model_transform: { value: new THREE.Matrix4() },
        projection_camera_model_transform: { value: new THREE.Matrix4() },
        light_positions_or_vectors: { value: [] },
        light_colors: { value: [] },
        light_attenuation_factors: { value: [] }
    };

    // Create the ShaderMaterial using the custom vertex and fragment shaders
    return new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: uniforms
    });
}

// TODO: Finish the custom shader for planet 3's ring with sinusoidal brightness variation
function createRingMaterial(materialProperties) {
    let vertexShader = `
        varying vec3 vPosition;
        void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `;

    // TODO: Finish the fragment shader to create the brightness variation with sinine finction
    let fragmentShader = `
        precision mediump float;
        uniform vec3 color;
        varying vec3 vPosition;

        void main() {
            // Radial distance in the ring plane
            float r = length(vPosition.xy);

            // Soft mask for the ring body (inner=1.5, outer=2.5)
            float inner = 1.5;
            float outer = 2.5;
            float body  = step(inner, r) * (1.0 - step(outer, r));
            if (body < 0.5) discard;

            // Sinusoidal modulation across radius
            float frequency = 4.0;
            float t = (r - inner) / (outer - inner); 
            float wave = 0.5 + 0.5 * sin(6.2831853 * frequency * t);

            // Sharpen contrast a bit
            float brightness = pow(wave, 1.2);

            gl_FragColor = vec4(color * brightness, 1.0);
        }
    `;


    return new THREE.ShaderMaterial({
        uniforms: {
            color: { value: materialProperties.color }
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,   
        transparent: true,        
        depthTest: true,
        depthWrite: false         
    });
}

// This function is used to update the uniform of the planet's materials in the animation step. No need to make any change
function updatePlanetMaterialUniforms(planet) {
    const material = planet.material;
    if (!material.uniforms) return;

    const uniforms = material.uniforms;

    const numLights = 1;
    const lights = scene.children.filter(child => child.isLight).slice(0, numLights);
    // Ensure we have the correct number of lights
    if (lights.length < numLights) {
        console.warn(`Expected ${numLights} lights, but found ${lights.length}. Padding with default lights.`);
    }
    
    // Update model_transform and projection_camera_model_transform
    planet.updateMatrixWorld();
    camera.updateMatrixWorld();

    uniforms.model_transform.value.copy(planet.matrixWorld);
    uniforms.projection_camera_model_transform.value.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
    ).multiply(planet.matrixWorld);

    // Update camera_center
    uniforms.camera_center.value.setFromMatrixPosition(camera.matrixWorld);

    // Update squared_scale (in case the scale changes)
    const scale = planet.scale;
    uniforms.squared_scale.value.set(
        scale.x * scale.x,
        scale.y * scale.y,
        scale.z * scale.z
    );

    // Update light uniforms
    uniforms.light_positions_or_vectors.value = [];
    uniforms.light_colors.value = [];
    uniforms.light_attenuation_factors.value = [];

    for (let i = 0; i < numLights; i++) {
        const light = lights[i];
        if (light) {
            let position = new THREE.Vector4();
            if (light.isDirectionalLight) {
                // For directional lights
                const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(light.quaternion);
                position.set(direction.x, direction.y, direction.z, 0.0);
            } else if (light.position) {
                // For point lights
                position.set(light.position.x, light.position.y, light.position.z, 1.0);
            } else {
                // Default position
                position.set(0.0, 0.0, 0.0, 1.0);
            }
            uniforms.light_positions_or_vectors.value.push(position);

            // Update light color
            const color = new THREE.Vector4(light.color.r, light.color.g, light.color.b, 1.0);
            uniforms.light_colors.value.push(color);

            // Update attenuation factor
            let attenuation = 0.0;
            if (light.isPointLight || light.isSpotLight) {
                const distance = light.distance || 1000.0; // Default large distance
                attenuation = 1.0 / (distance * distance);
            } else if (light.isDirectionalLight) {
                attenuation = 0.0; // No attenuation for directional lights
            }
            // Include light intensity
            const intensity = light.intensity !== undefined ? light.intensity : 1.0;
            attenuation *= intensity;

            uniforms.light_attenuation_factors.value.push(attenuation);
        } else {
            // Default light values
            uniforms.light_positions_or_vectors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 0.0));
            uniforms.light_colors.value.push(new THREE.Vector4(0.0, 0.0, 0.0, 1.0));
            uniforms.light_attenuation_factors.value.push(0.0);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// TODO: Implement the camera attachment given the key being pressed
// Hint: This step you only need to determine the object that are attached to and assign it to a variable you have to store the attached object.
function onKeyDown(e) {
    switch (e.key) {
        case '1': attachedObject = 0; break;       // Planet 1
        case '2': attachedObject = 1; break;       // Planet 2
        case '3': attachedObject = 2; break;       // Planet 3
        case '4': attachedObject = 3; break;       // Planet 4
        case '5': attachedObject = 'moon'; break;  // Planet 4's Moon
        case '0': attachedObject = null; break;    // Detach
        default: return;
    }
}

function animate() {
    requestAnimationFrame(animate);
    let time = clock.getElapsedTime();

    // TODO: Animate sun radius and color
    let period10 = time % 10.0;
    const period = 10.0;
    const phase = period10 / period;

    // Linear triangle wave in [0,1]: 0→1→0
    const progress = 1 - Math.abs(2 * phase - 1);

    // Map progress [0,1] to radius [1,3]
    const sunRadius = 1 + 2 * progress;

    // Sun scale
    sun.scale.set(sunRadius, sunRadius, sunRadius);

    // Color
    sun.material.color.setRGB(1, progress, progress); // 1, 0, 0 → 1, 1, 1 (red to white)

    // TODO: Update sun light
    sunLight.color.setRGB(1, progress, progress);
    sunLight.power = Math.pow(10, sunRadius); // Adjust power based on radius

    // TODO: Loop through all the orbiting planets and apply transformation to create animation effect
    planets.forEach(function (obj, index) {
        let planet = obj.mesh
        let distance = obj.distance
        let speed = obj.speed; 
        
        let model_transform = new THREE.Matrix4(); 
        
        // TODO: Implement the model transformations for the planets
        let angle = time * speed;
        let translation = translationMatrix(distance * Math.cos(angle), 0, distance * Math.sin(angle));
        model_transform.multiply(translation);

        // Hint: Some of the planets have the same set of transformation matrices, but for some you have to apply some additional transformation to make it work (e.g. planet4's moon, planet3's wobbling effect(optional)).
        planet.matrix.copy(model_transform);
        planet.matrixAutoUpdate = false;

        // Special handling: Planet 4's moon
        if (obj.name === "planet4" && planet.children && planet.children.length > 0) {
            // Moon orbits at radius 2.5 with angular speed 1.5 rad/s
            const moonSpeed = 1.5;
            const moonAngle = time * moonSpeed;

            // Local transform = rotate around Y, then translate out on X, then scale smaller
            const moonRot  = rotationMatrixY(moonAngle);
            const moonTrans = translationMatrix(2.5, 0, 0);
            const moonScale = new THREE.Matrix4().makeScale(0.35, 0.35, 0.35);

            const moonLocal = new THREE.Matrix4();
            moonLocal.multiply(moonRot);
            moonLocal.multiply(moonTrans);
            moonLocal.multiply(moonScale);

            const moonMesh = planet.children[planet.children.length - 1]; // p4Moon
            moonMesh.matrix.copy(moonLocal);
            moonMesh.matrixAutoUpdate = false;
        }

        // Camera attachment logic here, when certain planet is being attached, we want the camera to be following the planet by having the same transformation as the planet itself. No need to make changes.
        if (attachedObject === index){
            let cameraTransform = new THREE.Matrix4();

            // Copy the transformation of the planet (Hint: for the wobbling planet 3, you might have to rewrite to the model_tranform so that the camera won't wobble together)
            cameraTransform.copy(model_transform);
            
            // Add a translation offset of (0, 0, 10) in front of the planet
            let offset = translationMatrix(0, 0, 10);
            cameraTransform.multiply(offset);

            // Apply the new transformation to the camera position
            let cameraPosition = new THREE.Vector3();
            cameraPosition.setFromMatrixPosition(cameraTransform);
            camera.position.lerp(cameraPosition, blendingFactor);

            // Make the camera look at the planet
            let planetPosition = new THREE.Vector3();
            planetPosition.setFromMatrixPosition(planet.matrix);
            camera.lookAt(planetPosition);

            // Disable controls
            controls.enabled = false;
        } 

        // TODO: If camera is detached, slowly lerp the camera back to the original position and look at the origin
        else if (attachedObject === 'moon' && obj.name === 'planet4') {
            // Recompute the moon's local transform
            const moonSpeed = 1.5;
            const moonAngle = time * moonSpeed;

            const moonRot   = rotationMatrixY(moonAngle);
            const moonTrans = translationMatrix(2.5, 0, 0);
            const moonScale = new THREE.Matrix4().makeScale(0.35, 0.35, 0.35);

            // Local moon matrix: R * T * S
            const moonLocal = new THREE.Matrix4()
                .multiply(moonRot)
                .multiply(moonTrans)
                .multiply(moonScale);

            // World matrix for the moon = planet4.model * moonLocal
            const moonWorld = new THREE.Matrix4().copy(model_transform).multiply(moonLocal);

            // Put camera 10 units "ahead" of the moon
            const offset = translationMatrix(0, 0, 10);
            moonWorld.multiply(offset);

            const desired = new THREE.Vector3();
            desired.setFromMatrixPosition(moonWorld);
            camera.position.lerp(desired, blendingFactor);

            // Look at the moon's world position without the offset
            const moonLookAt = new THREE.Vector3();
            moonLookAt.setFromMatrixPosition(new THREE.Matrix4().copy(model_transform).multiply(moonLocal));
            camera.lookAt(moonLookAt);

            controls.enabled = false;
        }

        else if (attachedObject === null) {
            // Smoothly go back to default position and look at origin
            camera.position.lerp(defaultCamPos, blendingFactor);
            camera.lookAt(0, 0, 0);
            controls.enabled = true;
        }
    });
    
    // TODO: Apply Gouraud/Phong shading alternatively to Planet 2
    const even = (Math.floor(time) % 2) === 0;
    const nextMat = even ? p2PhongMat : p2GouraudMat;

    if (planet2.material !== nextMat) {
        planet2.material = nextMat;
        planet2.material.needsUpdate = true;
    }

    // Update custom shader uniforms so lighting works
    // TODO: Update customized planet material uniforms
    // e.g. updatePlanetMaterialUniforms(planets[1].mesh);
    planets.forEach(obj => {
        if (obj.mesh.material.isShaderMaterial) {
            updatePlanetMaterialUniforms(obj.mesh);
        }
    });

    // Update controls only when the camera is not attached
    if (controls.enabled) {
        controls.update();
    }

    renderer.render(scene, camera);
}