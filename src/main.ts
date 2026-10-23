import './styles/tokens.css';
import './styles/grid.css';
import './styles/blocks.css';
import './styles/editor.css';
import './blocks';

import { h } from './core/dom';
import { Editor } from './app/editor';
import { mountTopbar } from './app/topbar';
import { loadDocument } from './app/storage';
import { seedDocument } from './app/seed';

const app = document.getElementById('app')!;
const stage = h('main', { class: 'aime-stage' });
const editor = new Editor(stage, loadDocument() ?? seedDocument());
app.replaceChildren(mountTopbar(editor), stage);

if (import.meta.env.DEV) Object.assign(window, { aime: editor });
