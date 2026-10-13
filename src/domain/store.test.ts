import {beforeEach,it,expect} from 'vitest';
import {useEditor} from './store';
beforeEach(()=>useEditor.getState().newPhoto());
it('coalesces a drag and restores it in one undo',()=>{const s=useEditor.getState();s.startInteraction();s.setAdjustment('exposure',1);s.startInteraction();s.setAdjustment('exposure',2);s.finishInteraction();expect(useEditor.getState().past).toHaveLength(1);s.undo();expect(useEditor.getState().recipe.exposure).toBe(0);s.redo();expect(useEditor.getState().recipe.exposure).toBe(2);});
it('commits a pending drag before undo',()=>{const s=useEditor.getState();s.startInteraction();s.setAdjustment('shadows',30);s.undo();expect(useEditor.getState().recipe.shadows).toBe(0);});
it('ignores no-op changes and clears redo on a new edit',()=>{const s=useEditor.getState();s.setAdjustment('exposure',0);expect(useEditor.getState().past).toHaveLength(0);s.setAdjustment('exposure',1);s.undo();s.setAdjustment('tint',20);expect(useEditor.getState().future).toHaveLength(0);});
it('does not carry another photo history',()=>{const s=useEditor.getState();s.setAdjustment('contrast',20);s.newPhoto();expect(useEditor.getState().past).toHaveLength(0);expect(useEditor.getState().recipe.contrast).toBe(0);});
