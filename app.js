// AR场景初始化
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// AR渲染器设置
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建盒子模型
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 检查摄像头权限
async function checkCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // 获取成功后释放流
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('摄像头权限检查失败:', error);
    return false;
  }
}

// AR初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 先检查摄像头权限
  const hasPermission = await checkCameraPermission();
  if (!hasPermission) {
    alert('无法访问摄像头。请确保已授予摄像头权限，并确保没有其他应用正在使用摄像头。');
    return;
  }

  try {
    const arToolkitSource = new ARjs.ArToolkitSource({
      sourceType: 'webcam',
    });

    // 改进初始化处理
    arToolkitSource.init(function() {
      setTimeout(() => {
        onResize();
      }, 2000);
      
      const arToolkitContext = new ARjs.ArToolkitContext({
        cameraParametersUrl: 'data/camera_para.dat',
        detectionMode: 'mono',
      });

      arToolkitContext.init(() => {
        camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
        // 渲染循环
        function animate() {
          requestAnimationFrame(animate);
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          renderer.render(scene, camera);
        }
        animate();
      });
    }, function(error) {
      console.error('AR工具包初始化失败:', error);
      alert('AR初始化失败: ' + error);
    });

    // 处理窗口大小变化
    function onResize() {
      arToolkitSource.onResizeElement();
      arToolkitSource.copyElementSizeTo(renderer.domElement);
      if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
      }
    }

    window.addEventListener('resize', onResize);

  } catch (error) {
    console.error('AR初始化失败:', error);
    alert('AR功能初始化失败，错误信息: ' + error.message);
  }
});