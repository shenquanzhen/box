// 场景初始化
const scene = new THREE.Scene();

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // 设置相机初始位置

// 渲染器设置
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true  // 透明背景，便于视频叠加
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// 添加光源
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

// 创建3D对象 - 立方体固定在场景中
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshPhongMaterial({ 
  color: 0x00ff00,
  shininess: 100
});
const cube = new THREE.Mesh(geometry, material);
cube.position.set(0, 0, -3); // 将立方体放置在相机前方
scene.add(cube);

// 创建视频背景
let video, videoTexture, videoMaterial, videoScreen;

// 设备方向和运动传感器
let deviceOrientationControls = null;
let hasDeviceOrientation = false;

// 检查摄像头权限
async function checkCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: window.innerWidth },
        height: { ideal: window.innerHeight }
      } 
    });
    return stream;
  } catch (error) {
    console.error('摄像头权限检查失败:', error);
    return null;
  }
}

// 请求设备方向权限（iOS 13+需要）
async function requestDeviceOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && 
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const permissionState = await DeviceOrientationEvent.requestPermission();
      return permissionState === 'granted';
    } catch (error) {
      console.error('设备方向权限请求失败:', error);
      return false;
    }
  }
  return true; // 对于不需要请求权限的设备，默认返回true
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 先检查摄像头权限
  const stream = await checkCameraPermission();
  if (!stream) {
    alert('无法访问摄像头。请确保已授予摄像头权限，并确保没有其他应用正在使用摄像头。');
    return;
  }

  // 请求设备方向权限
  const hasOrientationPermission = await requestDeviceOrientationPermission();
  if (!hasOrientationPermission) {
    alert('无法访问设备方向传感器。某些功能可能受限。');
  }

  try {
    // 创建视频元素
    video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true; // 重要：iOS上需要
    video.muted = true;
    video.play();
    
    // 创建视频纹理
    videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    
    // 创建全屏视频背景
    const videoGeometry = new THREE.PlaneGeometry(2, 2);
    videoMaterial = new THREE.MeshBasicMaterial({ 
      map: videoTexture,
      side: THREE.DoubleSide
    });
    
    // 创建背景场景
    const backgroundScene = new THREE.Scene();
    const backgroundCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
    videoScreen = new THREE.Mesh(videoGeometry, videoMaterial);
    backgroundScene.add(videoScreen);
    
    // 设置设备方向控制
    setupDeviceControls();
    
    // 渲染循环
    function animate() {
      requestAnimationFrame(animate);
      
      // 更新设备方向控制（如果可用）
      if (deviceOrientationControls && hasDeviceOrientation) {
        deviceOrientationControls.update();
      }
      
      // 旋转立方体（轻微自转，增强3D效果）
      cube.rotation.y += 0.005;
      
      // 先渲染视频背景
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(backgroundScene, backgroundCamera);
      
      // 再渲染3D场景
      renderer.render(scene, camera);
    }
    
    // 处理窗口大小变化
    function onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
    }
    
    // 设置设备方向和运动控制
    function setupDeviceControls() {
      // 监听设备方向变化
      window.addEventListener('deviceorientation', function(event) {
        if (!hasDeviceOrientation) {
          hasDeviceOrientation = true;
          
          // 创建简单的设备方向控制
          const alpha = event.alpha || 0; // Z轴旋转
          const beta = event.beta || 0;   // X轴旋转
          const gamma = event.gamma || 0; // Y轴旋转
          
          // 根据设备方向更新相机位置
          updateCameraFromOrientation(alpha, beta, gamma);
        }
      });
      
      // 如果设备支持DeviceMotionEvent，使用它来更新相机位置
      window.addEventListener('devicemotion', function(event) {
        if (event.rotationRate) {
          const alpha = event.rotationRate.alpha || 0;
          const beta = event.rotationRate.beta || 0;
          const gamma = event.rotationRate.gamma || 0;
          
          // 使用旋转速率微调相机位置
          camera.position.x += gamma * 0.01;
          camera.position.y += beta * 0.01;
          
          // 确保相机始终看向立方体
          camera.lookAt(cube.position);
        }
      });
      
      // 添加鼠标控制（用于桌面设备）
      document.addEventListener('mousemove', function(event) {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 根据鼠标位置微调相机位置
        camera.position.x = x * 2;
        camera.position.y = y * 2;
        camera.position.z = 5; // 保持z轴距离
        
        // 确保相机始终看向立方体
        camera.lookAt(cube.position);
      });
    }
    
    // 根据设备方向更新相机位置
    function updateCameraFromOrientation(alpha, beta, gamma) {
      // 将角度转换为弧度
      const alphaRad = THREE.MathUtils.degToRad(alpha);
      const betaRad = THREE.MathUtils.degToRad(beta);
      const gammaRad = THREE.MathUtils.degToRad(gamma);
      
      // 根据设备方向计算相机位置
      camera.position.x = Math.sin(gammaRad) * 5;
      camera.position.y = Math.sin(betaRad) * 5;
      camera.position.z = 5 - Math.cos(betaRad) * Math.cos(gammaRad) * 2;
      
      // 确保相机始终看向立方体
      camera.lookAt(cube.position);
    }
    
    window.addEventListener('resize', onResize);
    
    // 开始动画循环
    animate();

    // 显示使用提示
    document.getElementById('info').textContent = '移动设备来从不同角度观察立方体';

  } catch (error) {
    console.error('初始化失败:', error);
    alert('功能初始化失败，错误信息: ' + error.message);
  }
});