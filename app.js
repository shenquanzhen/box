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
cube.position.set(0, 0, 0); // 将立方体放置在场景中心
scene.add(cube);

// 创建视频背景
let video, videoTexture, videoMaterial, videoScreen;

// 设备方向和运动传感器
let deviceOrientationControls = null;
let hasDeviceOrientation = false;
let isRotating = true; // 控制立方体是否旋转

// 调试元素
const debugElement = document.getElementById('debug');

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

// 更新调试信息
function updateDebugInfo() {
  if (!debugElement) return;
  
  const info = {
    '立方体位置': `X: ${cube.position.x.toFixed(2)}, Y: ${cube.position.y.toFixed(2)}, Z: ${cube.position.z.toFixed(2)}`,
    '相机位置': `X: ${camera.position.x.toFixed(2)}, Y: ${camera.position.y.toFixed(2)}, Z: ${camera.position.z.toFixed(2)}`,
    '设备方向': hasDeviceOrientation ? '已检测' : '未检测',
    '视频状态': video ? (video.paused ? '已暂停' : '播放中') : '未初始化',
    '屏幕尺寸': `${window.innerWidth}x${window.innerHeight}`,
    '视频尺寸': video ? `${video.videoWidth}x${video.videoHeight}` : '未知'
  };
  
  debugElement.innerHTML = Object.entries(info)
    .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
    .join('');
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
    
    // 获取视频流的实际宽高比
    video.addEventListener('loadedmetadata', () => {
      const videoAspect = video.videoWidth / video.videoHeight;
      adjustBackgroundToVideoAspect(videoAspect);
      updateDebugInfo(); // 更新调试信息
    });
    
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
    
    // 设置UI控制
    setupUIControls();
    
    // 调整背景视频以匹配视频流的宽高比
    function adjustBackgroundToVideoAspect(videoAspect) {
      const screenAspect = window.innerWidth / window.innerHeight;
      
      if (videoAspect > screenAspect) {
        // 视频比屏幕宽，调整高度
        const scale = screenAspect / videoAspect;
        videoScreen.scale.set(1, scale, 1);
      } else {
        // 视频比屏幕窄，调整宽度
        const scale = videoAspect / screenAspect;
        videoScreen.scale.set(scale, 1, 1);
      }
    }
    
    // 渲染循环
    function animate() {
      requestAnimationFrame(animate);
      
      // 更新设备方向控制（如果可用）
      if (deviceOrientationControls && hasDeviceOrientation) {
        deviceOrientationControls.update();
      }
      
      // 旋转立方体（轻微自转，增强3D效果）
      if (isRotating) {
        cube.rotation.y += 0.01;
        cube.rotation.x += 0.005;
      }
      
      // 先渲染视频背景
      renderer.autoClear = false;
      renderer.clear();
      renderer.render(backgroundScene, backgroundCamera);
      
      // 再渲染3D场景
      renderer.render(scene, camera);
      
      // 每10帧更新一次调试信息，避免性能问题
      if (Math.floor(Date.now() / 100) % 3 === 0) {
        updateDebugInfo();
      }
    }
    
    // 处理窗口大小变化
    function onResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      
      // 重新调整视频背景
      if (video.videoWidth && video.videoHeight) {
        adjustBackgroundToVideoAspect(video.videoWidth / video.videoHeight);
      }
      
      updateDebugInfo();
    }
    
    // 设置UI控制
    function setupUIControls() {
      // 重置立方体位置
      const resetButton = document.getElementById('resetCube');
      if (resetButton) {
        resetButton.addEventListener('click', () => {
          cube.position.set(0, 0, 0);
          updateDebugInfo();
        });
      }
      
      // 暂停/继续旋转
      const toggleButton = document.getElementById('toggleRotation');
      if (toggleButton) {
        toggleButton.addEventListener('click', () => {
          isRotating = !isRotating;
          updateDebugInfo();
        });
      }
      
      // 更换立方体颜色
      const colorButton = document.getElementById('changeCubeColor');
      if (colorButton) {
        colorButton.addEventListener('click', () => {
          const colors = [0x00ff00, 0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
          const currentColor = material.color.getHex();
          const currentIndex = colors.indexOf(currentColor);
          const nextIndex = (currentIndex + 1) % colors.length;
          material.color.setHex(colors[nextIndex]);
          updateDebugInfo();
        });
      }
    }
    
    // 设置设备方向和运动控制
    function setupDeviceControls() {
      // 监听设备方向变化
      window.addEventListener('deviceorientation', function(event) {
        hasDeviceOrientation = true;
        
        // 获取设备方向数据
        const alpha = event.alpha || 0; // Z轴旋转
        const beta = event.beta || 0;   // X轴旋转
        const gamma = event.gamma || 0; // Y轴旋转
        
        // 根据设备方向更新相机位置
        updateCameraFromOrientation(alpha, beta, gamma);
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
      camera.position.x = Math.sin(gammaRad) * 3;
      camera.position.y = Math.sin(betaRad) * 3;
      camera.position.z = 5 - Math.cos(betaRad) * Math.cos(gammaRad) * 2;
      
      // 确保相机始终看向立方体
      camera.lookAt(cube.position);
    }
    
    window.addEventListener('resize', onResize);
    
    // 开始动画循环
    animate();

    // 显示使用提示
    const infoElement = document.getElementById('info');
    if (infoElement) {
      infoElement.textContent = '移动设备来从不同角度观察立方体';
    }
    
    // 初始更新调试信息
    updateDebugInfo();

  } catch (error) {
    console.error('初始化失败:', error);
    alert('功能初始化失败，错误信息: ' + error.message);
  }
});