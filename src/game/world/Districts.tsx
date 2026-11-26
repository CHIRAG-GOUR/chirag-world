'use client';
// District gateways: a signed limestone arch at each district's plaza-facing edge.
// Hero landmarks replace the empty district lots in later milestones.
import { Text } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useMaterials } from './materials';
import { interactables } from '../data/interactables';
import { districtById } from '../data/world';
import { FONT_UI } from './Plaza';

export default function Districts() {
  const M = useMaterials();
  const gates = interactables.filter(i => i.kind === 'district');
  return (
    <group>
      {gates.map(g => {
        const d = districtById[g.district];
        const [x, , z] = g.position;
        const face = Math.atan2(-x, -z); // arch faces the plaza
        return (
          <group key={g.id} position={[x, 0, z]} rotation-y={face}>
            {[-4.2, 4.2].map(px => (
              <mesh key={px} position={[px, 3.2, 0]} material={M.limestone} castShadow receiveShadow>
                <boxGeometry args={[1.2, 6.4, 1.2]} />
              </mesh>
            ))}
            <mesh position={[0, 6.9, 0]} material={M.limestone} castShadow><boxGeometry args={[10, 1.1, 1.4]} /></mesh>
            <mesh position={[0, 6.25, 0.72]}><boxGeometry args={[8.2, 0.12, 0.04]} /><meshStandardMaterial color={d.color} roughness={0.6} /></mesh>
            <Text font={FONT_UI} fontSize={0.62} color="#2d2822" position={[0, 6.92, 0.72]} anchorX="center" anchorY="middle" letterSpacing={0.14}>
              {d.name.toUpperCase()}
            </Text>
            <mesh position={[0, 0.55, -3]} material={M.stoneDark} castShadow><boxGeometry args={[1.6, 1.1, 0.5]} /></mesh>
            <Text font={FONT_UI} fontSize={0.16} color="#efe9dc" position={[0, 0.75, -2.74]} anchorX="center" maxWidth={1.4} textAlign="center">
              {d.built ? d.blurb : 'Under construction'}
            </Text>
            <RigidBody type="fixed" colliders={false}>
              <CuboidCollider args={[0.6, 3.2, 0.6]} position={[-4.2, 3.2, 0]} />
              <CuboidCollider args={[0.6, 3.2, 0.6]} position={[4.2, 3.2, 0]} />
            </RigidBody>
          </group>
        );
      })}
    </group>
  );
}
