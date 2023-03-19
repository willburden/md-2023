import BouquetCanvas from '@/components/BouquetCanvas';
import bg from '@/assets/paper-texture.png';

export default function Home() {
  return (
    <>
      <div className='home' style={{ backgroundImage: `url(${bg.src})` }}>
        <div className='header'>
          <h1>Happy Mother&apos;s Day!</h1>
          <p>❤️ Will</p>
        </div>
      </div>
      <BouquetCanvas />
    </>
  );
}
