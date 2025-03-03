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

// AR初始化
document.addEventListener('DOMContentLoaded', () => {
  try {
    const arToolkitSource = new ARjs.ArToolkitSource({
      sourceType: 'webcam',
    });

    const arToolkitContext = new ARjs.ArToolkitContext({
      cameraParametersUrl: 'data/camera_para.dat',
      detectionMode: 'mono',
    });

    arToolkitSource.init(() => {
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
    });
  } catch (error) {
    console.error('AR初始化失败:', error);
    alert('AR功能初始化失败，请检查摄像头权限并刷新页面');
  }
});