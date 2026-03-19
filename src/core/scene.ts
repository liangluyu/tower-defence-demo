import {
  AmbientLight,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  Vector3,
} from "three";
import { buildableBounds, mapConfig } from "../config/mapConfig";

export class GameScene {
  readonly scene = new Scene();
  readonly root = new Group();
  readonly worldSize = {
    width: buildableBounds.maxX - buildableBounds.minX,
    height: buildableBounds.maxZ - buildableBounds.minZ,
  };

  constructor() {
    this.scene.background = new Color(0x08131a);
    this.scene.add(this.root);
    this.addLights();
    this.addBoard();
    this.addPath();
  }

  private addLights() {
    const ambient = new AmbientLight(0xffffff, 1.45);
    this.scene.add(ambient);

    const directional = new DirectionalLight(0xe8fbff, 1.75);
    directional.position.set(7, 16, 4);
    directional.castShadow = true;
    directional.shadow.mapSize.set(2048, 2048);
    directional.shadow.camera.left = -16;
    directional.shadow.camera.right = 16;
    directional.shadow.camera.top = 16;
    directional.shadow.camera.bottom = -16;
    this.scene.add(directional);
  }

  private addBoard() {
    const board = new Mesh(
      new PlaneGeometry(22, 20),
      new MeshStandardMaterial({
        color: 0x18313b,
        roughness: 0.92,
        metalness: 0.06,
      }),
    );
    board.rotation.x = -Math.PI / 2;
    board.receiveShadow = true;
    this.root.add(board);

    const grid = new Mesh(
      new PlaneGeometry(19.8, 17.8, 12, 12),
      new MeshStandardMaterial({
        color: 0x10252d,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      }),
    );
    grid.rotation.x = -Math.PI / 2;
    grid.position.y = 0.01;
    this.root.add(grid);
  }

  private addPath() {
    const points = mapConfig.points.map(([x, y, z]) => new Vector3(x, y + 0.03, z));
    const curve = new CatmullRomCurve3(points, false, "centripetal");
    const material = new MeshStandardMaterial({
      color: 0x40616d,
      roughness: 0.72,
      metalness: 0.08,
      side: DoubleSide,
    });

    for (let i = 0; i < 90; i += 1) {
      const t = i / 89;
      const point = curve.getPoint(t);
      const tangent = curve.getTangent(t);
      const segment = new Mesh(new CircleGeometry(mapConfig.laneWidth, 16), material);
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = Math.atan2(tangent.z, tangent.x);
      segment.position.copy(point);
      segment.receiveShadow = true;
      this.root.add(segment);
    }
  }
}
