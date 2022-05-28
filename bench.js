







const { signal, effect, onCleanup } = require('./packages/compostate');

const [disposed, setDisposed] = signal ( false );

effect ( () => {

  console.log ( 'effect' );

  if ( disposed () ) return;

  const [sig, setSig] = signal ( 0 );

  sig ();

  onCleanup ( () => {

    setSig ( Math.random () );

  });
  
});

setDisposed ( true );
