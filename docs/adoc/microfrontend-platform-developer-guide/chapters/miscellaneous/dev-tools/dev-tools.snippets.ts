import {MicrofrontendPlatform, OutletRouter} from '@scion/microfrontend-platform';
import {Beans} from '@scion/toolkit/bean-manager';

{
  // tag::dev-tools:register-dev-tools[]
  MicrofrontendPlatform.startHost({
    applications: [
      // register your micro application(s) here

      // register the 'devtools' micro application
      {
        symbolicName: 'devtools',
        manifestUrl: 'https://scion-microfrontend-platform-devtools-<version>.vercel.app/assets/manifest.json', // <1>
        intentionCheckDisabled: true, // <2>
        scopeCheckDisabled: true, // <2>
      },
    ],
  });
  // end::dev-tools:register-dev-tools[]
}

`
  // tag::dev-tools:dev-tools-outlet[]
  <sci-router-outlet name="devtools"></sci-router-outlet>
  // end::dev-tools:dev-tools-outlet[]
`;

{
  // tag::dev-tools:dev-tools-navigation[]
  Beans.get(OutletRouter).navigate('https://scion-microfrontend-platform-devtools-<version>.vercel.app', {outlet: 'devtools'});
  // end::dev-tools:dev-tools-navigation[]
}
