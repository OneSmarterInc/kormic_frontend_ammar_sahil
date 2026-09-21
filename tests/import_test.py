import importlib.util
from pathlib import Path
import shutil
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('import_portals',ROOT/'scripts/import_portals.py')
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class IntegrationTests(unittest.TestCase):
    def test_git_blob_hash(self):
        self.assertEqual(module.blob_sha(b''),'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    def test_missing_anchor_fails(self):
        with self.assertRaises(ValueError):module.replace_once('different','expected','replacement','test')
    def test_duplicate_anchor_fails(self):
        with self.assertRaises(ValueError):module.replace_once('aa','a','x','test')
    def test_exact_anchor_is_replaced_once(self):
        self.assertEqual(module.replace_once('before old after','old','new','test'),'before new after')
    def test_all_entry_components_use_verified_guest_state(self):
        for role in ('institute','superuser','university'):
            entry=module.portal_entry(role)
            self.assertIn('status === "guest"',entry)
            self.assertIn('/login?portal='+role,entry)
            self.assertNotIn('localStorage',entry)
            self.assertNotIn('sessionStorage',entry)
    def test_staged_adapters_leave_api_files_identical(self):
        # Minimal fixtures test transformation mechanics, not complete portal builds.
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            for role in ('university','institute','superuser'):
                (root/role/'src/components/auth').mkdir(parents=True)
                (root/role/'src/context').mkdir()
                (root/role/'src/api').mkdir()
                (root/role/'src/App.jsx').write_text('import LandingPage from "./pages/LandingPage";\nimport LoginPage from "./pages/auth/LoginPage";\n')
                (root/role/'src/context/AuthContext.jsx').write_text('const status = "guest";')
                (root/role/'src/api/client.js').write_text('const endpoint = "/auth/web/login/";')
            (root/'student/src/features/auth').mkdir(parents=True)
            (root/'student/src/App.tsx').write_text("import { ActivityIndicator, BackHandler, StatusBar, StyleSheet, View } from 'react-native';\n  if (!frauncesLoaded || !interLoaded || restoringSession) {\n")
            (root/'student/src/features/auth/useStudentSession.ts').write_text("    dispatch({ type: 'LOGOUT' });\n")
            (root/'student/app.json').write_text('{"expo":{}}')
            changes=module.integrate(root)
            self.assertEqual(len(changes),9)
            for role in ('university','institute','superuser'):
                self.assertEqual((root/role/'src/api/client.js').read_text(),'const endpoint = "/auth/web/login/";')
            self.assertIn("Platform.OS !== 'web'",(root/'student/src/App.tsx').read_text())
            self.assertIn('"baseUrl": "/student"',(root/'student/app.json').read_text())

if __name__=='__main__':unittest.main()
