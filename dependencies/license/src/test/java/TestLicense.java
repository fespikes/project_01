import io.transwarp.pilot.license.CheckLicense;
import junit.framework.TestCase;

/**
 * Created by jiajie on 17-5-11.
 */
public class TestLicense extends TestCase {

    public void testCheckLicense(){
        CheckLicense check = new CheckLicense();
        String str = "172.16.2.41:2291";
        boolean success = check.checkLicense(str);
        assert success;
    }
}
