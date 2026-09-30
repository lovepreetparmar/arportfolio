export function SceneEnvironment() {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <directionalLight position={[-4, -2, -3]} intensity={0.25} />
    </>
  )
}
