import {defineConfig} from 'cypress';
import {fileURLToPath,URL} from 'node:url';
const local=(path:string)=>fileURLToPath(new URL(path,import.meta.url));
export default defineConfig({
 video:false,screenshotsFolder:'test-results/ui',viewportWidth:1440,viewportHeight:900,
 component:{
  specPattern:['cypress/component/**/*.cy.tsx','cypress/registry/**/*.cy.tsx'],supportFile:'cypress/support/component.ts',
  devServer:{framework:'react',bundler:'vite',viteConfig:{
   resolve:{alias:[
    {find:'@getpaseo/plugin/client/ui',replacement:local('./cypress/support/paseo-ui.tsx')},
    {find:'@getpaseo/plugin/client',replacement:local('./cypress/support/paseo-client.tsx')},
    {find:/^react-native$/,replacement:'react-native-web'},
   ]},oxc:{jsx:{runtime:'automatic'}},
  }},
 },
});
