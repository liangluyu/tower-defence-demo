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
import type { LevelDefinition } from "../types/game";
import { PathRuntime } from "../utils/path";

export class GameScene {
  readonly scene = new Scene();
  readonly root = new Group();
  private pathGroup = new Group();
  private board?: Mesh;
  private grid?: Mesh;

  constructor(level: LevelDefinition) {
    this.scene.background = new Color(0x08131a);
    this.scene.add(this.root);
    this.scene.add(this.pathGroup);
    this.addLights();
    this.setLevel(level);
  }

  setLevel(level: LevelDefinition) {
    this.clearLevelMeshes();
    this.addBoard(level);
    this.addPath(new PathRuntime(level.path));
  }

  private clearLevelMeshes() {
    if (this.board) {
      this.root.remove(this.board);
    }
    if (this.grid) {
      this.root.remove(this.grid);
    }
    this.pathGroup.clear();
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

  private addBoard(level: LevelDefinition) {
    const width = Math.max(22, level.bounds.maxX - level.bounds.minX + 3);
    const height = Math.max(20, level.bounds.maxZ - level.bounds.minZ + 3);

    this.board = new Mesh(
      new PlaneGeometry(width, height),
      new MeshStandardMaterial({
        color: 0x18313b,
        roughness: 0.92,
        metalness: 0.06,
      }),
    );
    this.board.rotation.x = -Math.PI / 2;
    this.board.receiveShadow = true;
    this.root.add(this.board);

    this.grid = new Mesh(
      new PlaneGeometry(width - 1, height - 1, 12, 12),
      new MeshStandardMaterial({
        color: 0x10252d,
        wireframe: true,
        transparent: true,
        opacity: 0.22,
      }),
    );
    this.grid.rotation.x = -Math.PI / 2;
    this.grid.position.y = 0.01;
    this.root.add(this.grid);
  }

  private addPath(path: PathRuntime) {
    const points = path.pathPoints.map((point) => point.clone().add(new Vector3(0, 0.03, 0)));
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
      const segment = new Mesh(new CircleGeometry(path.laneWidth, 16), material);
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = Math.atan2(tangent.z, tangent.x);
      segment.position.copy(point);
      segment.receiveShadow = true;
      this.pathGroup.add(segment);
    }
  }
}
