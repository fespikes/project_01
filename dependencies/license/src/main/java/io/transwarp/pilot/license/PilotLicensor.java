package io.transwarp.pilot.license;

import dnw.srvlic.info.v2.CompLicInfoV2;
import io.transwarp.msl.Licensor;
import org.apache.zookeeper.Watcher;

/**
 * Created by jiajie on 17-5-11.
 */
public class PilotLicensor extends Licensor {
    public PilotLicensor(String licenseZKQuorum, CompLicInfoV2.CompTypeV2 licenseType, Watcher watcher) {
        super(licenseZKQuorum, licenseType, watcher);
    }

    @Override
    public void createLicenseInstance(CompLicInfoV2 licInfoV2) {
        PilotLicense.createinstance(licInfoV2);
    }
}
