/* model-viewer 3.5.0 compatibility adapter.
 * Its public material API changes opacity, but hitFromPoint only excludes
 * meshes whose scene visibility is false. Keep access to the pinned internal
 * scene in this guarded adapter, so layers also behave correctly when picked.
 * Revalidate against upstream ModelScene.ts before upgrading model-viewer.
 */
(function () {
  "use strict";
  window.AnatomyMeshVisibility = {
    bind: function (viewer, states) {
      var sceneSymbol = Object.getOwnPropertySymbols(viewer).find(function (key) {
        return key.description === "scene";
      });
      var scene = sceneSymbol && viewer[sceneSymbol];
      if (!scene || !scene.currentGLTF || !scene.currentGLTF.scene || !scene.queueRender) return null;
      var byName = new Map();
      states.forEach(function (state) { state.meshes = []; byName.set(state.name, state); });
      scene.currentGLTF.scene.traverse(function (mesh) {
        if (!mesh.isMesh || !mesh.material) return;
        var materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach(function (material) {
          var state = byName.get(material.name);
          if (state) state.meshes.push(mesh);
        });
      });
      if (states.some(function (state) { return !state.meshes.length; })) return null;
      return {
        apply: function (state, visible) {
          state.meshes.forEach(function (mesh) { mesh.visible = visible; });
          scene.queueRender();
        }
      };
    }
  };
}());
